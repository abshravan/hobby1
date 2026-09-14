"""Acceptance checks for the hospital voice-agent POC.

These assert the architectural requirements rather than the conversation:
gpt-live-1 fronts the call, the work is delegated to a Responses backend, and
there is exactly one tool, executed here in Python.

Run with: pytest test_main.py
"""

import asyncio
import json

import pytest
from pipecat.frames.frames import EndFrame, LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.services.openai.live import events
from pipecat.services.openai.live.llm import OpenAILiveLLMService
from pipecat.services.openai.responses.llm import OpenAIResponsesLLMService
from pipecat.workers.runner import WorkerRunner

import main


@pytest.fixture(autouse=True)
def api_key(monkeypatch):
    """main.py loads .env at import, which may leave the key blank."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")


def build_llm():
    """The service exactly as main.py configures it."""
    return OpenAILiveLLMService(
        api_key="test-key",
        settings=OpenAILiveLLMService.Settings(
            model=main.REALTIME_MODEL,
            system_instruction=main.HOSPITAL_RECEPTIONIST_PROMPT,
        ),
        delegation=OpenAILiveLLMService.ResponsesDelegation(
            settings=OpenAIResponsesLLMService.Settings(
                model=main.BACKEND_MODEL,
                system_instruction=main.BACKEND_PROMPT,
                reasoning=OpenAIResponsesLLMService.ReasoningConfig(effort="low"),
            ),
        ),
    )


# --- Model requirements ------------------------------------------------------


def test_realtime_model_is_gpt_live_1():
    assert main.REQUIRED_REALTIME_MODEL == "gpt-live-1"
    assert main.REALTIME_MODEL == "gpt-live-1"


def test_no_other_realtime_model_is_referenced():
    source = open(main.__file__).read()
    for forbidden in ("gpt-4o-realtime", "gpt-5-realtime", "realtime-preview"):
        assert forbidden not in source, f"{forbidden} must not appear in main.py"


def test_substituted_realtime_model_is_rejected(monkeypatch):
    monkeypatch.setattr(main, "REALTIME_MODEL", "gpt-4o-realtime-preview")
    with pytest.raises(RuntimeError, match="gpt-live-1"):
        main.check_config()


def test_missing_api_key_is_reported(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        main.check_config()


def test_backend_model_is_not_a_realtime_model():
    assert "realtime" not in main.BACKEND_MODEL
    assert main.BACKEND_MODEL != main.REQUIRED_REALTIME_MODEL


# --- The one tool ------------------------------------------------------------


def test_exactly_one_backend_tool_with_a_schema():
    context = LLMContext([], [main.get_hospital_info])
    tools = context.tools.standard_tools
    assert len(tools) == 1
    assert tools[0].name == "get_hospital_info"
    assert tools[0].description


def test_tool_runs_in_python_and_returns_hospital_info():
    captured = {}

    class FakeParams:
        async def result_callback(self, result):
            captured["result"] = result

    asyncio.run(main.get_hospital_info(FakeParams()))
    result = captured["result"]
    assert result["hospital_name"] == "Demo General Hospital"
    assert result["hours"] == "Open 24 hours, every day"
    assert "Cardiology" in result["departments"]


# --- Delegation --------------------------------------------------------------


def test_session_start_uses_gpt_live_1_and_delegates_the_tool():
    """The session config sent to OpenAI is the POC's acceptance evidence.

    The live model is gpt-live-1, delegation is the Responses kind, and the one
    tool hangs off the *backend* — gpt-live-1 is never offered it.
    """
    llm = build_llm()
    llm._context = LLMContext([], [main.get_hospital_info])
    sent = []

    async def capture(event):
        sent.append(event)

    llm.send_client_event = capture
    asyncio.run(llm._send_session_config())

    session = sent[0].model_dump(exclude_none=True)["session"]
    assert session["model"] == "gpt-live-1"
    assert session["delegation"]["type"] == "responses"

    backend = session["delegation"]["responses"]
    assert backend["model"] == main.BACKEND_MODEL
    assert [t["name"] for t in backend["tools"]] == ["get_hospital_info"]
    # The live model gets no tools of its own; only the backend does.
    assert "tools" not in session


def test_delegated_tool_call_runs_in_python_and_the_result_goes_back():
    """Drive steps 4-6 of the acceptance sequence through a running pipeline.

    A function call from the delegated Responses model is injected as the
    server would send it; the assertion is that Python ran the tool and the
    result was returned to the Live API as a function_call_output.
    """
    sent = []

    async def go():
        llm = build_llm()
        context = LLMContext(
            [{"role": "developer", "content": "Greet the caller and offer to help."}],
            [main.get_hospital_info],
        )
        user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

        async def capture(event):
            sent.append(event)

        async def no_network():
            pass

        llm.send_client_event = capture
        llm._connect = no_network
        llm._disconnect = no_network

        worker = PipelineWorker(
            Pipeline([user_aggregator, llm, assistant_aggregator]),
            cancel_on_idle_timeout=False,
        )

        @worker.event_handler("on_pipeline_started")
        async def on_started(worker, frame):
            await worker.queue_frames([LLMRunFrame()])
            await asyncio.sleep(0.5)
            await llm._handle_evt_response(
                events.ResponseEventEnvelope(
                    type="response.event",
                    delegation_id="dlg_test",
                    event={
                        "type": "response.output_item.done",
                        "item": {
                            "type": "function_call",
                            "status": "completed",
                            "call_id": "call_test",
                            "name": "get_hospital_info",
                            "arguments": "{}",
                        },
                    },
                )
            )
            await asyncio.sleep(1.0)
            await worker.queue_frame(EndFrame())

        runner = WorkerRunner(handle_sigint=False)
        await runner.add_workers(worker)
        await runner.run()

    asyncio.run(go())

    outputs = [
        e.model_dump(exclude_none=True)
        for e in sent
        if e.model_dump(exclude_none=True).get("type") == "response.item.create"
    ]
    assert len(outputs) == 1, "expected exactly one function_call_output back to the Live API"
    item = outputs[0]["item"]
    assert item["type"] == "function_call_output"
    assert item["call_id"] == "call_test"
    result = json.loads(item["output"])
    assert result["hospital_name"] == "Demo General Hospital"
    assert "Cardiology" in result["departments"]


# --- Observability -----------------------------------------------------------


def test_pipecat_tail_observer_is_available():
    from pipecat_tail.observer import TailObserver

    assert TailObserver is not None
