# Vercel serverless entrypoint for the ApnaDairy farmer API.
#
# Vercel runs each file under `api/` as a serverless function. This single
# function wraps the whole FastAPI application with Mangum (ASGI adapter),
# so every route (/api/v1/...) is served without changing any app code.
# Local development still uses uvicorn directly (see start-dev / README).
from mangum import Mangum

from app.main import app

# Vercel calls this `handler`. lifespan="off" because serverless functions
# have no persistent lifespan; the app is fully stateless (no startup hooks,
# no background tasks), so nothing is lost.
handler = Mangum(app, lifespan="off")
