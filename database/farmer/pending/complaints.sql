-- ============================================================================
-- PENDING MIGRATION — NOT APPLIED. DO NOT RUN without explicit approval.
-- ============================================================================
-- Table: complaints
-- Target project: apnadairy-web (https://aquatwwnpvnmirkqnhlp.supabase.co) ONLY.
-- NEVER the mobile project ("ApnaDairy Mobile App", bxsvnamareirdgjqngba).
--
-- Why this is pending:
--   * The live farmer backend (api/v1/farmer/complaints.py ->
--     services/farmer/complaint_service.py) reads and writes a "complaints"
--     table in the WEB project, but the web database does NOT have this
--     table (verified absent 2026-10-08). The complaints router is live, so
--     filing a complaint would 404/500 until this table exists.
--   * This DDL is derived column-for-column from the backend code
--     (complaint_service.py + schemas/farmer/complaint.py):
--       id:          TEXT PK, format "CMP-<6 HEX>" (generated client-side)
--       farmer_id:   FK -> farmers.id (uuid in the live web schema)
--       category:    e.g. 'quality' | 'rider' | 'order' | 'payment'
--       message:     complaint text
--       photo_url:   optional photo (stored in the farmer-photos bucket)
--       status:      'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
--       admin_reply: written from the web portal/admin side
--       created_at:  timestamptz
--   * farmer_id type: the live web farmers.id is uuid; the backend passes the
--     farmer's web farmers.id, so the FK is uuid -> uuid.
--
-- Security (farmer-owned table, backend-only access):
--   * REVOKE ALL from anon/authenticated BEFORE enabling RLS.
--   * ENABLE ROW LEVEL SECURITY with NO permissive policies. The farmer
--     backend uses the service_role key (server-side only), which bypasses
--     RLS by design — the mobile app never touches this table directly.
--   * Never "fix" a 42501 with GRANT ALL to anon/authenticated.
--
-- Apply checklist (Supabase SQL editor, web project, when approved):
--   1. Run this file once in the web project's SQL editor.
--   2. Confirm: table exists, RLS enabled, zero permissive policies.
--   3. Move this file's entry from "pending" to "applied" in README.md and
--      add a tables/complaints.sql reference file describing the live table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS complaints (
    id          TEXT PRIMARY KEY,
    farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    category    TEXT NOT NULL,
    message     TEXT NOT NULL,
    photo_url   TEXT,
    status      TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','CLOSED')),
    admin_reply TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_farmer ON complaints (farmer_id);

-- Security: backend service_role only (bypasses RLS by design).
GRANT ALL ON complaints TO service_role;

REVOKE ALL ON complaints FROM anon, authenticated;

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
-- No permissive policies on purpose: a leaked anon key can read/write nothing.
