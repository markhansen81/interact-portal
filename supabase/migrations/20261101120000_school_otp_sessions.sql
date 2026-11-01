create table if not exists school_otp_sessions (
  id             uuid primary key default gen_random_uuid(),
  project_token  text not null,
  email          text not null,
  otp_code       text not null,      -- 6-digit code (plain, short-lived 15 min)
  session_key    text unique,        -- set after verification, stored in cookie
  expires_at     timestamptz not null,
  verified_at    timestamptz,
  created_at     timestamptz default now()
);

create index if not exists school_otp_sessions_token_idx on school_otp_sessions (project_token);
create index if not exists school_otp_sessions_session_key_idx on school_otp_sessions (session_key) where session_key is not null;
