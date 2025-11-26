ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS trend_context JSONB,
  ADD COLUMN IF NOT EXISTS insta_rationale TEXT,
  ADD COLUMN IF NOT EXISTS proof_state TEXT DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS proof_owner TEXT,
  ADD COLUMN IF NOT EXISTS proof_notes TEXT,
  ADD COLUMN IF NOT EXISTS lint_report JSONB;

