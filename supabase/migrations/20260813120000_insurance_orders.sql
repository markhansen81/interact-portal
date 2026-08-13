-- Insurance orders from Squarespace Commerce
create table if not exists insurance_orders (
  id uuid primary key default gen_random_uuid(),
  squarespace_order_id text unique not null,
  order_number text,
  customer_email text not null,
  customer_first_name text,
  customer_last_name text,
  -- Custom form fields from Squarespace
  insured_first_name text,
  insured_last_name text,
  school_name text,
  project_date text,
  participation_fee numeric,
  num_project_days integer,
  agb_accepted boolean default false,
  data_privacy_accepted boolean default false,
  -- Order details
  product_name text,
  total numeric not null default 0,
  currency text default 'EUR',
  -- PDF / tracking
  invoice_pdf_url text,
  email_sent_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_insurance_orders_created on insurance_orders(created_at desc);
create index if not exists idx_insurance_orders_email on insurance_orders(customer_email);

alter table insurance_orders enable row level security;

create policy "admin_read_insurance_orders" on insurance_orders
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_write_insurance_orders" on insurance_orders
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "service_role_insurance_orders" on insurance_orders
  for all using (auth.role() = 'service_role');
