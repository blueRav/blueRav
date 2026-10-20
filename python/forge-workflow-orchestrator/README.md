# Forge Workflow Orchestrator

A durable asynchronous workflow orchestrator with dependency validation, bounded concurrency, retries, timeouts, and exact-action approval gates.

## Run
Python 3.12+; standard library only. From this project directory:

```sh
python orchestrator.py
python -m unittest discover -s tests -v
```

Review the printed pending action and replace DIGEST with its exact approval digest:

```sh
python orchestrator.py --approve DIGEST --reviewer your-name
```

## How it works
SQLite preserves completed outputs and audit events across restarts. The inventory and demand specialists run concurrently; their results feed a plan, then an approval-gated simulated reservation. Digests bind the run, plan, inputs, and dependency outputs. Reusing a run with changed inputs is rejected.

## Limits
Interrupted work may run again: external actions must be idempotent. Use one process per run. Reviewer labels are audit metadata, not authenticated identities. Retries are bounded and immediate. The demonstration changes synthetic state only.

Source and deterministic tests are included. CI exercises this project on Python 3.12 and 3.13. This portfolio prototype was developed with AI assistance.
