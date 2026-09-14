#
# Hospital voice-agent POC — OpenAI Live (gpt-live-1) + Responses delegation.
#
# Based on the current Pipecat example:
#   examples/realtime/realtime-openai-live-responses-delegation.py
#
# The live model (gpt-live-1) holds the spoken conversation. Anything that
# needs hospital facts is delegated to an OpenAI-hosted Responses model, which
# calls the one backend tool below. The tool itself runs here, in Python.
#

"""Hospital receptionist POC: gpt-live-1 → Responses delegation → get_hospital_info."""

import os
import sys

from dotenv import load_dotenv
from loguru import logger

from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker, ProcessorUnusablePolicy
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    AssistantTurnStoppedMessage,
    LLMContextAggregatorPair,
    UserTurnMessageAddedMessage,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.llm_service import FunctionCallParams
from pipecat.services.openai.live.llm import OpenAILiveLLMService
from pipecat.services.openai.responses.llm import OpenAIResponsesLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.workers.runner import WorkerRunner
from pipecat_tail.observer import TailObserver

load_dotenv(override=True)

# --- Model configuration -----------------------------------------------------
#
# The realtime model is fixed by this POC's requirements. It is read from the
# environment so it is explicit, but a substitution is rejected rather than
# silently accepted: the whole point of the POC is that gpt-live-1 fronts the
# conversation.
REQUIRED_REALTIME_MODEL = "gpt-live-1"
REALTIME_MODEL = os.getenv("OPENAI_REALTIME_MODEL", REQUIRED_REALTIME_MODEL)

# The delegated-to backend. This is a text model, not a realtime one: it is
# what actually calls get_hospital_info.
BACKEND_MODEL = os.getenv("OPENAI_BACKEND_MODEL", "gpt-5.6-terra")

TAIL_HOST = os.getenv("TAIL_HOST", "localhost")
TAIL_PORT = int(os.getenv("TAIL_PORT", "9292"))


def check_config():
    """Fail fast on missing credentials or a substituted realtime model."""
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env and fill it in.")
    if REALTIME_MODEL != REQUIRED_REALTIME_MODEL:
        raise RuntimeError(
            f"OPENAI_REALTIME_MODEL is {REALTIME_MODEL!r}, but this POC requires "
            f"{REQUIRED_REALTIME_MODEL!r}. Substituting another realtime model is not allowed."
        )


# --- Prompts -----------------------------------------------------------------
#
# One prompt for the agent. The frontend prompt is the whole agent persona; the
# backend prompt only says how to use the tool result, and exists because the
# delegated model is a separate request.
HOSPITAL_RECEPTIONIST_PROMPT = """You are a helpful hospital receptionist.
Answer callers naturally and concisely — one or two sentences at a time — and
let the caller finish before you respond. If the caller interrupts you, stop
and listen.

Greet the caller, and explain that you can help with hospital information.

When you need hospital-specific information — the name, address, opening
hours, phone number, emergency department, or departments — delegate the
request to the backend. Include what the caller asked for in the delegation.
Keep the conversation going while the delegated work runs and relay the
result once it arrives.

Never invent hospital information. If the backend does not provide the
information, say that you don't have it."""

BACKEND_PROMPT = """You are helping a hospital receptionist during a live
voice call. The request may contain transcription errors; use the most likely
intent. Call get_hospital_info for anything about the hospital itself and
answer only from what it returns. Reply in concise, conversational plain text
— no Markdown, no raw JSON. If the tool does not cover what was asked, say
the information is not available."""


# --- The one backend tool ----------------------------------------------------


async def get_hospital_info(params: FunctionCallParams):
    """Get factual information about the hospital: name, address, opening hours, phone number, emergency department, and the departments it has."""
    logger.info("TOOL: get_hospital_info called (executing in Python)")
    try:
        info = {
            "hospital_name": "Demo General Hospital",
            "address": "123 Main Street, Springfield",
            "hours": "Open 24 hours, every day",
            "phone": "+1-555-0100",
            "emergency_department": "Open 24/7, walk-ins accepted",
            "departments": ["Cardiology", "Emergency", "Radiology", "Pediatrics"],
        }
    except Exception as e:  # pragma: no cover - mock data can't fail today
        logger.error(f"TOOL: get_hospital_info failed: {e}")
        await params.result_callback({"error": "Hospital information is unavailable right now."})
        return

    logger.info(f"TOOL: get_hospital_info result: {info}")
    await params.result_callback(info)


# --- Transport ---------------------------------------------------------------
#
# WebRTC is the simplest transport that needs no third-party account: the
# runner serves a browser client you can talk into.
transport_params = {
    "webrtc": lambda: TransportParams(audio_in_enabled=True, audio_out_enabled=True),
}


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    logger.info(f"Starting hospital receptionist POC with realtime model {REALTIME_MODEL}")

    llm = OpenAILiveLLMService(
        api_key=os.environ["OPENAI_API_KEY"],
        settings=OpenAILiveLLMService.Settings(
            model=REALTIME_MODEL,
            system_instruction=HOSPITAL_RECEPTIONIST_PROMPT,
        ),
        # Delegation: gpt-live-1 does not run the tool itself. It hands the
        # request to this Responses model, which calls get_hospital_info.
        delegation=OpenAILiveLLMService.ResponsesDelegation(
            settings=OpenAIResponsesLLMService.Settings(
                model=BACKEND_MODEL,
                system_instruction=BACKEND_PROMPT,
                reasoning=OpenAIResponsesLLMService.ReasoningConfig(effort="low"),
            ),
        ),
    )

    # The context's tools are the *backend* model's tools; their handlers run
    # here. The developer message seeds the session so the agent speaks first.
    context = LLMContext(
        [{"role": "developer", "content": "Greet the caller and offer to help."}],
        [get_hospital_info],
    )

    # OpenAI Live is full-duplex: it detects turns and handles interruptions
    # itself, so there is no local VAD in the pipeline.
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            user_aggregator,
            llm,
            transport.output(),
            assistant_aggregator,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        idle_timeout_secs=runner_args.pipeline_idle_timeout_secs,
        # Pipecat Tail: serves the dashboard feed on ws://TAIL_HOST:TAIL_PORT.
        observers=[TailObserver(host=TAIL_HOST, port=TAIL_PORT)],
        processor_unusable_policy=ProcessorUnusablePolicy.END,
    )

    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Caller connected")
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Caller disconnected")
        await runner.cancel()

    @llm.event_handler("on_session_started")
    async def on_session_started(llm, session):
        logger.info(f"LIVE: gpt-live-1 session started ({session.id})")

    @llm.event_handler("on_delegation_created")
    async def on_delegation_created(llm, delegation):
        logger.info(f"DELEGATION: gpt-live-1 delegated to the backend ({delegation.id})")

    @llm.event_handler("on_function_calls_started")
    async def on_function_calls_started(llm, function_calls):
        logger.info(f"TOOL: backend requested {[f.function_name for f in function_calls]}")

    @user_aggregator.event_handler("on_user_turn_message_added")
    async def on_user_turn_message_added(aggregator, message: UserTurnMessageAddedMessage):
        logger.info(f"CALLER: {message.content}")

    @assistant_aggregator.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn_stopped(aggregator, message: AssistantTurnStoppedMessage):
        logger.info(f"AGENT: {message.content}")

    await runner.run()


async def bot(runner_args: RunnerArguments):
    """Entry point used by the Pipecat runner."""
    check_config()
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    try:
        check_config()
    except RuntimeError as e:
        logger.error(str(e))
        sys.exit(1)

    from pipecat.runner.run import main

    main()
