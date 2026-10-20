# Sushi Sei Studio
A responsive restaurant redesign with a React frontend and a real FastAPI + SQLite backend.

[Hosted browser preview](https://bluerav.github.io/blueRav/) · [Original restaurant](http://www.sushiseiexpress.com/home.html)

The preview uses browser-local estimates and demo inquiries. Run the Python service below for server-priced quotes and persistent demo inquiries. This independent portfolio concept does not modify the restaurant's website or send orders, inquiries, or payments.

## Run the complete application
From this directory, with Docker installed:
```sh
docker compose up --build
```
Open http://localhost:8000. A named volume preserves SQLite data. The image serves the production React build and Python API together as an unprivileged user.

For development (Python 3.12+ and Node 22+), start two terminals:
```sh
cd backend
python -m venv .venv
# Activate .venv using your platform's activation command.
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
```sh
cd frontend
npm ci
npm run dev
```
Vite proxies /api to localhost:8000. Open the URL Vite prints.

## Working features
- Searchable, filterable 12-item menu with source-attributed posted prices.
- Persistent pickup plan, quantity controls, accessible modal, keyboard focus restoration.
- Python quotes derive prices from the canonical catalogue; client-supplied prices are rejected.
- Catalogue-based preference matching, without a model or paid API.
- Catering demo validation, SQLite persistence, idempotent submissions, and optional staff-only listing.
- New York market hours, directions, telephone pickup, reduced-motion support, and mobile navigation.

The form explicitly saves demo data only. Use sample details. The hosted preview stores its demo inquiry in sessionStorage; pickup selections use localStorage.

## API
Interactive OpenAPI documentation: http://localhost:8000/docs.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/health | Service readiness and demo status |
| GET | /api/restaurant | Verified business details and current market status |
| GET | /api/menu | Search, category, and diet filters |
| POST | /api/quote | Server-priced pickup estimate |
| POST | /api/recommend | Constrained catalogue recommendations |
| POST | /api/catering | Save a demo inquiry; accepts Idempotency-Key |
| GET | /api/catering | Private demo inbox; requires configured bearer token |

Use .env.example as a reference and export the variables in the shell that starts uvicorn; the development command does not load .env automatically. For Docker Compose, add an environment or env_file mapping to the service when configuring custom settings. SUSHI_ADMIN_TOKEN is empty by default, disabling the inbox. Never embed it in VITE_ variables. SUSHI_DATABASE controls SQLite location; SUSHI_ALLOWED_ORIGINS configures allowed development origins. The public inquiry endpoint is a demonstration: production use would need authenticated staff, rate limits, retention controls, operational monitoring, and deployment-specific TLS.

## Verification
```sh
cd backend
python -m unittest discover -s tests -v
cd ../frontend
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:ui
```
The browser suite starts the Python service, verifies quotes and SQLite inquiry receipts, checks keyboard interaction and mobile navigation, and runs axe checks at 1440px and 390px. Artifacts include screenshots and a JSON report. Automated checks supplement manual inspection; they do not certify complete accessibility.

For a static preview build:
```sh
VITE_STATIC_PREVIEW=true npm run build
node tools/smoke-preview.mjs
```
GitHub Pages serves this mode; it cannot execute Python. Docker serves the complete application.

## Sources and free design resources
Business facts, chef story, hours, address, and posted menu prices were checked against the restaurant's home, menu, and party-tray pages on October 20, 2026. Party trays require 24 hours' advance notice. Prices and availability must be confirmed with the restaurant; the sample menu is not an exhaustive current menu.

The hero photograph is illustrative, not a photograph of this business. The build downloads an Unsplash image and records its origin and SHA-256 in the generated asset provenance file. Bodoni Moda and Manrope are free Google Fonts; icons are Lucide.

Free design guidance: [Agensi Frontend Design — Production-Grade UI with Distinctive Aesthetics](https://agensi.io/skills/frontend-design-production-grade-ui-with-distinctive-aesthetics). No paid skill, API key, or subscription is required for the default application.
