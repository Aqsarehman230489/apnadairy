# triggers/

No triggers are defined for the farmer portal's web-project tables.

The farmer portal keeps all business logic in the FastAPI backend
(`~/workspace/App/backend/farmer/`); the web database is the shared
apnadairy-web project and its trigger posture is owned by the web team.

This directory exists so that any future farmer-portal `CREATE TRIGGER`
statements (plus their trigger functions) get their own file here, named
`<trigger_name>.sql`, with a header comment noting the source, purpose, and
that it targets the web project only. Never create triggers in the mobile
project ("ApnaDairy Mobile App").
