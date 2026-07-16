-- Church items: synced from Monday Opp/Project boards via webhook
create table if not exists church_items (
  id uuid primary key default gen_random_uuid(),
  monday_opp_id text unique,
  monday_project_id text,
  monday_contact_ids text[] default '{}',
  monday_org_ids text[] default '{}',
  source text not null default 'opportunity' check (source in ('opportunity', 'project')),
  name text not null,
  school_name text,
  deal_value numeric,
  deal_stage text,
  project_status text,
  program_type text,
  school_type text,
  grade_level text,
  num_students integer,
  num_groups integer,
  num_days integer,
  num_tas integer,
  price_pp numeric,
  co_taught text,
  accommodation text,
  school_year text,
  street text,
  city text,
  postcode text,
  state text,
  contact_email text,
  contact_phone text,
  sales_rep text,
  staffing_notes text,
  feedback text,
  invoice_details text,
  start_date date,
  end_date date,
  kw integer,
  year integer,
  coord_status text default 'ToDo',
  staff_status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_church_items_year_kw on church_items(year, kw);
create index if not exists idx_church_items_source on church_items(source);

-- TA slots: sub-rows for each church item
create table if not exists church_ta_slots (
  id uuid primary key default gen_random_uuid(),
  church_item_id uuid not null references church_items(id) on delete cascade,
  slot_number integer not null,
  ta_id uuid references profiles(id),
  work_order_id uuid references work_orders(id),
  status text default 'open' check (status in ('open', 'offered', 'assigned', 'confirmed', 'declined')),
  assigned_at timestamptz,
  created_at timestamptz default now(),
  unique(church_item_id, slot_number)
);

create index if not exists idx_church_ta_slots_item on church_ta_slots(church_item_id);
create index if not exists idx_church_ta_slots_ta on church_ta_slots(ta_id);

-- CRM automation log
create table if not exists crm_automation_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  source_board text,
  source_item_id text,
  target_board text,
  target_item_id text,
  details text,
  created_at timestamptz default now()
);

create index if not exists idx_crm_log_created on crm_automation_log(created_at desc);

-- RLS
alter table church_items enable row level security;
alter table church_ta_slots enable row level security;
alter table crm_automation_log enable row level security;

create policy "admin_church_items" on church_items for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "service_church_items" on church_items for all
  using (auth.role() = 'service_role');

create policy "admin_church_ta_slots" on church_ta_slots for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "service_church_ta_slots" on church_ta_slots for all
  using (auth.role() = 'service_role');
create policy "ta_own_slots" on church_ta_slots for select
  using (ta_id = auth.uid());

create policy "admin_crm_log" on crm_automation_log for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "service_crm_log" on crm_automation_log for all
  using (auth.role() = 'service_role');

-- Auto-create TA slots when num_tas changes
create or replace function create_ta_slots() returns trigger as $$
declare
  filled_count integer;
begin
  delete from church_ta_slots where church_item_id = NEW.id and ta_id is null;
  if NEW.num_tas is not null and NEW.num_tas > 0 then
    select count(*) into filled_count from church_ta_slots
      where church_item_id = NEW.id and ta_id is not null;
    for i in (filled_count + 1)..NEW.num_tas loop
      insert into church_ta_slots (church_item_id, slot_number, status)
      values (NEW.id, i, 'open')
      on conflict (church_item_id, slot_number) do nothing;
    end loop;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_church_item_slots
  after insert or update of num_tas on church_items
  for each row execute function create_ta_slots();
