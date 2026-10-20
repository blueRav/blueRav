# Python portfolio

Five runnable projects demonstrating orchestration, agent memory, scoped tools, constrained decisions, and full-stack development. The first four use only Python's standard library; the restaurant uses free open-source FastAPI and React dependencies.

| Project | Demonstrates |
| --- | --- |
| [Forge Workflow Orchestrator](forge-workflow-orchestrator/) | Async DAG, durable checkpoints, approval digests, concurrency and retry budgets |
| [Atlas Agent Memory](atlas-agent-memory/) | SQLite FTS5, evidence provenance, revisions, scope, expiry, optimistic concurrency |
| [Scoped MCP Toolbox](scoped-mcp-toolbox/) | Stdio JSON-RPC, tool schemas, resources, prompts, lifecycle and scope validation |
| [Policy Support Agent](policy-support-agent/) | Bounded planning, evidence-backed tools, human review, optional live model adapter |
| [Sushi Sei Studio](sushi-sei-studio/) | React + FastAPI + SQLite restaurant redesign, production build, browser QA |

## Quick start
```sh
git clone https://github.com/blueRav/blueRav.git
cd blueRav/python/forge-workflow-orchestrator
python orchestrator.py
python -m unittest discover -s tests -v
```

Follow each project's README for its own commands and limitations. Install the restaurant's backend requirements before running all Python tests with `python tools/verify_python_suite.py` from the repository root.

[Restaurant preview](https://bluerav.github.io/blueRav/) uses browser-local demo state. Docker runs its complete Python backend. No project sends real restaurant orders, refunds, or messages. Default demos require no paid API or skill. Optional live model calls are opt-in and may incur provider charges.

## Architecture choices
The orchestrator schedules explicit task graphs; the support agent demonstrates a planner/tool loop. They expose different agentic skills rather than labelling every deterministic function an AI agent. Memory checks source quotes without claiming semantic verification. The MCP server deliberately limits its protocol surface. Restaurant recommendations use catalogue rules, not an LLM.

## Validation
GitHub Actions runs Python suites on 3.12 and 3.13, frontend unit tests, production builds, and Playwright integration against a real FastAPI process. Browser checks cover menu recovery, server quotes, demo inquiry persistence, keyboard focus, mobile navigation, overflow, and serious/critical axe findings. The Pages workflow separately checks browser-only preview behavior and publishes visual QA evidence.
