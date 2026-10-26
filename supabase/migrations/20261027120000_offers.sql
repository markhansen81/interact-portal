-- Offers (Angebote) for schools
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_number text UNIQUE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  church_item_id uuid REFERENCES church_items(id) ON DELETE SET NULL,

  -- School details
  school_name text NOT NULL,
  contact_name text,
  contact_email text,
  school_address text,
  city text,
  postcode text,
  state text,

  -- Program details
  program_type text NOT NULL,
  grade_level text,
  num_students integer,
  num_groups integer,
  num_tas integer,
  num_days integer,
  start_date date,
  end_date date,
  school_year text,

  -- Pricing
  tariff integer DEFAULT 1 CHECK (tariff IN (1, 2)),
  price_pp numeric(10,2),
  total numeric(10,2),
  custom_notes text,

  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,

  -- PDF
  pdf_url text,
  brochure_program text,

  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Standard pricing per program
CREATE TABLE IF NOT EXISTS offer_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type text NOT NULL,
  school_year text NOT NULL,
  num_days integer NOT NULL,
  tariff_1 numeric(10,2),
  tariff_2 numeric(10,2),
  grade_range text,
  students_per_group text,
  tas_per_group integer DEFAULT 1,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_rates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage offers" ON offers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage offer_rates" ON offer_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_lead_id ON offers(lead_id);
CREATE INDEX idx_offers_church_item_id ON offers(church_item_id);
CREATE INDEX idx_offer_rates_program ON offer_rates(program_type, school_year, num_days);

-- Seed standard rates from Preisliste 2026/2027
-- PROJEKTWOCHE (5 TAGE)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Native Speaker Week', '2026/2027', 5, 129, 139, '5-9', '14-19', 1, 1),
  ('Art in Action Week', '2026/2027', 5, 129, 139, '10-13', '20-24+', 1, 2),
  ('Media Week', '2026/2027', 5, 139, 149, '5-13', '10-13', 1, 3),
  ('Theatre Week', '2026/2027', 5, 129, 139, '8-13', '24-32', 2, 4),
  ('Film Week', '2026/2027', 5, 139, 149, '8-13', '20-32', 2, 5),
  ('Class Trip', '2026/2027', 5, 129, 139, '5-13', '24-32', 2, 6);

-- WORKSHOPS (3 TAGE)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Monster Parade', '2026/2027', 3, 79, 89, '1-2', '20-32', 2, 10),
  ('Kids Space Adventure', '2026/2027', 3, 79, 89, '3-4', '20-32', 2, 11),
  ('Shakespeare Workshop', '2026/2027', 3, 99, 109, '9-13', '14-24', 1, 12),
  ('Debating Skills Workshop', '2026/2027', 3, 99, 109, '9-13', '14-24', 1, 13);

-- WORKSHOPS (2 TAGE)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Monster Parade', '2026/2027', 2, 59, 69, '1-2', '20-32', 2, 20),
  ('Kids Space Adventure', '2026/2027', 2, 59, 69, '3-4', '20-32', 2, 21);

-- WORKSHOPS (1 TAG)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Monster Parade', '2026/2027', 1, NULL, NULL, '1-2', '20-32', 2, 30),
  ('Kids Space Adventure', '2026/2027', 1, NULL, NULL, '3-4', '20-32', 2, 31);

-- KULTURTAG (1 TAG, Berlin/Brandenburg only)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Kulturtag', '2026/2027', 1, 16.50, NULL, '1-13', '18-32', 1, 40);

-- JOB PREP / TEST PREP (3 TAGE)
INSERT INTO offer_rates (program_type, school_year, num_days, tariff_1, tariff_2, grade_range, students_per_group, tas_per_group, sort_order) VALUES
  ('Job Prep Workshop', '2026/2027', 3, 99, 109, '9-13', '10-13', 1, 50),
  ('Test Prep Workshop', '2026/2027', 3, 99, 109, '9-13', '10-13', 1, 51);
