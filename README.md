# Antoine Morales

AI and Machine Learning Applications student at Penn State, focused on backend development and agentic systems.

I’m interested in how agents plan work, use tools, preserve useful memory, and make actions reviewable. My portfolio includes runnable prototypes that make those behaviors visible through source code, checkpoints, and tests.

## Agentic systems portfolio

| Project | What it does | Skills demonstrated |
| --- | --- | --- |
| [Relay Ops Orchestrator](https://github.com/blueRav/relay-ops-agent) | Coordinates diagnosis, planning, and verification specialists around an approved synthetic rollback | Multi-agent orchestration, delegation, handoffs, approval gates |
| [Evidence Trail Agent](https://github.com/blueRav/evidence-trail-agent) | Retrieves sources and produces a brief with exact evidence citations | Retrieval, provenance, validation, abstention |
| [Minute Keeper Agent](https://github.com/blueRav/minute-keeper-agent) | Remembers meeting commitments and preserves deadline revisions | Persistent memory, reconciliation, reviewed exports |
| [Dataset Scout Agent](https://github.com/blueRav/dataset-scout-agent) | Compares regression baselines with leakage controls and a frozen test split | Constrained experimentation, model selection, reproducibility |
| [Agent Gauntlet](https://github.com/blueRav/agent-gauntlet) | Evaluates completion and safety with adversarial cases and boundary probes | Agent evaluation, regression testing, observability |

Each repository includes source, synthetic fixtures, a deterministic demo, an optional live Responses API planner, architecture notes, example traces, and automated tests on Node.js 22 and 24.

The demos run without an API key. Live mode requires your own credentials and configured model. External writes are simulated; these are portfolio prototypes rather than production deployments.

## Try a project

```bash
git clone https://github.com/blueRav/relay-ops-agent.git
cd relay-ops-agent
npm ci --ignore-scripts
npm test
npm run demo
```

The incident demo pauses before changing state. Review its pending action, then follow the command shown to approve the synthetic rollback.

## Engineering interests

- Agent orchestration and typed tool interfaces
- AWS Lambda and backend services
- Evidence-backed decisions and persistent memory
- Human review for consequential actions
- Deterministic evaluation and clear failure modes

These projects were developed with AI assistance. Their source, tests, examples, and limitations are available for inspection.
