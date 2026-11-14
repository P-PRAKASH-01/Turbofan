# ENGINE-TWIN Backend Service Architecture (FastAPI)

**Package:** `backend/`  
**Framework:** FastAPI + WebSockets + Uvicorn  
**Status:** Architecture Scaffolding Established  

---

## Directory Layout
```text
backend/
├── README.md
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI application entry point
│   ├── api/                  # REST API routers & WebSocket streaming endpoints
│   ├── core/                 # App settings, logging, and security config
│   ├── schemas/              # Pydantic data schemas (telemetry, EHI, SDQI, diagnostics)
│   └── services/             # Digital twin integration services (model inference, causal filters)
└── tests/                    # Backend API unit and integration tests
```

See [`docs/frontend-backend-contract.md`](../docs/frontend-backend-contract.md) for endpoint contracts and streaming payloads.
