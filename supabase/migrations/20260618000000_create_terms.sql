CREATE TABLE IF NOT EXISTS terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  short_explanation text NOT NULL,
  detailed_explanation text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

-- Public glossary: anyone can read, insert, and delete terms.
-- This table contains no PII, so full public access is safe.
CREATE POLICY "public_select" ON terms FOR SELECT USING (true);
CREATE POLICY "public_insert" ON terms FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete" ON terms FOR DELETE USING (true);
