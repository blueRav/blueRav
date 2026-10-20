# Policy Support Agent

A bounded tool-using support agent that grounds a reply in ticket and policy evidence, then pauses for review before a simulated resolution.

## Run
Python 3.12+; standard library only. From this project directory:

```sh
python support_agent.py
python -m unittest discover -s tests -v
```

Review the printed pending action and replace DIGEST with its exact approval digest:

```sh
python support_agent.py --resume --approve DIGEST --reviewer your-name
```

## How it works
The default offline planner reads a synthetic ticket and returns policy, checks eligibility, drafts an authoritative response, and proposes a local review record. Typed argument checks, evidence requirements, exact-action approval, checkpoint scope, and step/token budgets constrain execution. Ineligible tickets route to human review.

## Limits
No refund, message, or external mutation occurs. Local checkpoints are trusted input and are not an authentication system. Optional live mode requires OPENAI_API_KEY and OPENAI_MODEL plus --live; provider usage may cost money. The default mode is free and needs no credentials. Live model usage is reported and budgeted after each response, not a prepaid hard cost cap.

Source and deterministic tests are included. CI exercises this project on Python 3.12 and 3.13. This portfolio prototype was developed with AI assistance.
