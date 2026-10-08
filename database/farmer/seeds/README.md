# seeds/

No seed data — the farmer portal tables in the web project already hold
production/operational rows (farmers: 14, area_managers: 6,
milk_collections: 650, farmer_payouts: 61, notifications: 6 as of
2026-10-08); farmer_profiles and farmer_requests start empty and are
created at runtime by the FastAPI backend (signup, onboarding, manager
requests). The pending `complaints` table starts empty when it is created.

Never insert seed rows into the shared web tables without web-team
approval, and never seed anything in the mobile project ("ApnaDairy Mobile
App") — farmer data lives in the web project only.
