# Sandesh.ai Intelligence Service

FastAPI helper service powering trend intelligence, linting, and MoEngage payloads.

## Setup

```bash
cd python_services
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn marcom_service:app --reload --host 0.0.0.0 --port 8787
```

Set the frontend to use the service:

```bash
echo "VITE_TREND_SERVICE_URL=http://localhost:8787" >> ../.env.local
```

## Endpoints

| Endpoint | Description |
| --- | --- |
| `GET /trend-insights` | Returns curated exam / event / influencer trends. |
| `POST /lint` | Runs automated checks on campaign copy. |
| `POST /moengage/payload` | Builds ready-to-push payloads + metadata for logging. |

Trend cache persists inside `trend_cache.json`; modify it to inject your own trending topics.

