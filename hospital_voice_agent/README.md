# Hospital Voice Agent — POC

A minimal Pipecat voice agent that proves one architecture end to end:
a **gpt-live-1** realtime model holds the spoken conversation and delegates
anything factual to an OpenAI-hosted **Responses** model, which calls **one**
Python tool.

**This is a POC. All hospital information is mock data** (see
`get_hospital_info` in `main.py`). There is no database, no booking, no patient
records — that comes later.

## Architecture

```
Caller (browser mic)
      │
      ▼
   Pipecat  ──────────── Pipecat Tail (dashboard)
      │
      ▼
  gpt-live-1                      ← speaks, listens, handles interruptions
      │
      │ Responses delegation      ← gpt-live-1 does NOT run the tool itself
      ▼
  Responses model (gpt-5.6-terra)
      │
      │ function call
      ▼
  get_hospital_info()             ← executed by Python, in this process
      │
      │ tool result
      ▼
  Responses model                 ← turns the result into plain text
      │
      ▼
  gpt-live-1                      ← relays it in its own words
      │
      ▼
    Caller
```

The Pipecat pipeline itself is five stages:

```
transport.input() → user_aggregator → gpt-live-1 → transport.output() → assistant_aggregator
```

There is no VAD processor: the Live API is full-duplex and detects turns and
interruptions itself.

## Environment variables

Copy `.env.example` to `.env` and fill it in.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | yes | — | The agent refuses to start without it. |
| `OPENAI_REALTIME_MODEL` | no | `gpt-live-1` | Must be `gpt-live-1`. The agent refuses to start with any other realtime model. |
| `OPENAI_BACKEND_MODEL` | no | `gpt-5.6-terra` | The delegated-to text model. Not a realtime model. |
| `TAIL_HOST` | no | `localhost` | Where the Tail observer serves its feed. |
| `TAIL_PORT` | no | `9292` | " |

## Install

```bash
cd hospital_voice_agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then add your OPENAI_API_KEY
```

## Run

```bash
python main.py -t webrtc
```

Then open <http://localhost:7860>, allow microphone access, and connect. The
agent greets you first.

## Pipecat Tail

The agent already attaches Pipecat Tail's observer, so the feed is live on
`ws://localhost:9292` whenever a call is running. Install the Pipecat CLI once:

```bash
uv tool install "pipecat-ai-cli[tail]"
```

and, in a second terminal while the agent is running:

```bash
pipecat tail
```

Tail shows the conversation, audio levels, service metrics, and the system log
— which is where the delegation and tool lines appear:

```
LIVE: gpt-live-1 session started (...)
CALLER: what time is the hospital open?
DELEGATION: gpt-live-1 delegated to the backend (dlg_...)
TOOL: backend requested ['get_hospital_info']
TOOL: get_hospital_info called (executing in Python)
TOOL: get_hospital_info result: {...}
AGENT: We're open 24 hours a day, every day.
```

## Example conversation

> **Caller:** Hi, what time is the hospital open?
> **Agent:** We're open 24 hours a day, every day.
>
> **Caller:** What departments do you have?
> **Agent:** We have Cardiology, Emergency, Radiology and Pediatrics.

## The delegation flow, in detail

`gpt-live-1` is configured with `ResponsesDelegation`, so the tool schema is
attached to the *backend* model's configuration, not the live model's. The live
model can therefore never call `get_hospital_info` directly — all it can do is
open a delegation. Concretely, the `session.start` Pipecat sends looks like:

```json
{
  "type": "session.start",
  "session": {
    "model": "gpt-live-1",
    "instructions": "You are a helpful hospital receptionist...",
    "delegation": {
      "type": "responses",
      "responses": {
        "model": "gpt-5.6-terra",
        "instructions": "You are helping a hospital receptionist...",
        "tools": [{ "type": "function", "name": "get_hospital_info", ... }]
      }
    }
  }
}
```

Note there is no `tools` key on the session itself.

From there:

1. The caller speaks; the Live API transcribes and hands the turn to gpt-live-1.
2. gpt-live-1 decides it needs hospital facts and opens a delegation
   (`on_delegation_created` fires).
3. OpenAI runs the Responses model against the delegated request.
4. That model emits a `get_hospital_info` function call, which arrives back over
   the Live websocket.
5. Pipecat runs the handler **here, in Python**, and sends the result back as a
   `function_call_output`.
6. The Responses model finishes its answer from the tool result.
7. The answer is appended to the live session as commentary and gpt-live-1
   speaks it in its own words.

## Tests

```bash
pip install pytest
pytest test_main.py
```

The suite asserts the acceptance criteria without needing an API key: that the
session model is `gpt-live-1`, that no other realtime model is referenced, that
a substituted model is rejected, that exactly one tool exists and is attached to
the backend, and — by injecting the function call a delegated Responses model
would make — that Python executes the tool and the result is returned to the
Live API.

## Files

```
hospital_voice_agent/
├── main.py            # the whole agent: prompt, tool, pipeline
├── test_main.py       # acceptance checks
├── .env.example
├── requirements.txt
└── README.md
```
