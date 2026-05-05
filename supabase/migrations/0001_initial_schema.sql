-- =========================================================================
-- Agency Panel — Initial Schema
-- =========================================================================
-- Multi-tenant model:
--   Agency  →  many Clients (brands)  →  many Projects  →  many Content + Posts
--   RLS ensures each agency only sees its own data.
-- =========================================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type project_status as enum ('idea', 'production', 'review', 'scheduled', 'published', 'archived');
create type content_type   as enum ('image', 'video');
create type content_status as enum ('pending', 'generating', 'ready', 'failed');
create type post_status    as enum ('draft', 'scheduled', 'publishing', 'published', 'failed');
create type social_platform as enum ('instagram', 'tiktok');
create type member_role    as enum ('owner', 'admin', 'editor');

-- ---------- Agencies ----------
create table agencies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---------- Agency members (team support) ----------
create table agency_members (
  agency_id   uuid not null references agencies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'editor',
  created_at  timestamptz not null default now(),
  primary key (agency_id, user_id)
);

-- ---------- Clients (brands) ----------
create table clients (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  name            text not null,
  industry        text,
  logo_url        text,
  brand_voice     text,        -- e.g. "playful, witty, gen-z"
  brand_colors    jsonb default '[]'::jsonb,    -- ["#FF6B35", "#1A1A1A"]
  brand_keywords  jsonb default '[]'::jsonb,    -- ["sustainable", "premium"]
  notes           text,
  created_at      timestamptz not null default now()
);

create index on clients (agency_id);

-- ---------- Social accounts (OAuth-connected) ----------
create table social_accounts (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references clients(id) on delete cascade,
  platform        social_platform not null,
  account_name    text not null,                -- @handle or display name
  account_id      text not null,                -- platform user/business id
  access_token    text not null,                -- encrypted at rest in production
  refresh_token   text,
  token_expires_at timestamptz,
  metadata        jsonb default '{}'::jsonb,    -- platform-specific extras
  connected_at    timestamptz not null default now(),
  unique (client_id, platform, account_id)
);

create index on social_accounts (client_id);

-- ---------- Projects (Kanban cards) ----------
create table projects (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references clients(id) on delete cascade,
  title        text not null,
  description  text,
  status       project_status not null default 'idea',
  position     integer not null default 0,        -- order within column
  due_date     date,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on projects (client_id, status, position);

-- ---------- Content items (generated assets) ----------
create table content_items (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references projects(id) on delete cascade,
  type            content_type not null,
  prompt          text not null,
  model           text,                            -- e.g. "black-forest-labs/flux-schnell"
  generation_params jsonb default '{}'::jsonb,
  asset_url       text,
  thumbnail_url   text,
  status          content_status not null default 'pending',
  error_message   text,
  created_at      timestamptz not null default now()
);

create index on content_items (project_id);

-- ---------- Posts (scheduled / published) ----------
create table posts (
  id                uuid primary key default uuid_generate_v4(),
  content_item_id   uuid not null references content_items(id) on delete cascade,
  social_account_id uuid not null references social_accounts(id) on delete cascade,
  caption           text,
  hashtags          jsonb default '[]'::jsonb,
  scheduled_for     timestamptz,
  posted_at         timestamptz,
  status            post_status not null default 'draft',
  platform_post_id  text,
  platform_post_url text,
  error_message     text,
  created_at        timestamptz not null default now()
);

create index on posts (status, scheduled_for);
create index on posts (social_account_id);

-- =========================================================================
-- Helper function: which agencies does the current user belong to?
-- =========================================================================
create or replace function user_agency_ids()
returns setof uuid
language sql security definer stable
as $$
  select agency_id from agency_members where user_id = auth.uid()
  union
  select id from agencies where owner_id = auth.uid()
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table agencies         enable row level security;
alter table agency_members   enable row level security;
alter table clients          enable row level security;
alter table social_accounts  enable row level security;
alter table projects         enable row level security;
alter table content_items    enable row level security;
alter table posts            enable row level security;

-- Agencies: members can read; only owner can update/delete
create policy "agencies: read own"  on agencies for select using (id in (select user_agency_ids()));
create policy "agencies: insert own" on agencies for insert with check (owner_id = auth.uid());
create policy "agencies: update owner" on agencies for update using (owner_id = auth.uid());
create policy "agencies: delete owner" on agencies for delete using (owner_id = auth.uid());

-- Agency members: members can read membership of their agencies
create policy "members: read own agency" on agency_members for select using (agency_id in (select user_agency_ids()));
create policy "members: insert as owner" on agency_members for insert with check (
  agency_id in (select id from agencies where owner_id = auth.uid())
);
create policy "members: delete as owner" on agency_members for delete using (
  agency_id in (select id from agencies where owner_id = auth.uid())
);

-- Clients
create policy "clients: full access within agency" on clients for all
  using (agency_id in (select user_agency_ids()))
  with check (agency_id in (select user_agency_ids()));

-- Social accounts (via client → agency)
create policy "social: full access within agency" on social_accounts for all
  using (client_id in (select id from clients where agency_id in (select user_agency_ids())))
  with check (client_id in (select id from clients where agency_id in (select user_agency_ids())));

-- Projects
create policy "projects: full access within agency" on projects for all
  using (client_id in (select id from clients where agency_id in (select user_agency_ids())))
  with check (client_id in (select id from clients where agency_id in (select user_agency_ids())));

-- Content items
create policy "content: full access within agency" on content_items for all
  using (project_id in (
    select p.id from projects p
    join clients c on c.id = p.client_id
    where c.agency_id in (select user_agency_ids())
  ))
  with check (project_id in (
    select p.id from projects p
    join clients c on c.id = p.client_id
    where c.agency_id in (select user_agency_ids())
  ));

-- Posts
create policy "posts: full access within agency" on posts for all
  using (content_item_id in (
    select ci.id from content_items ci
    join projects p on p.id = ci.project_id
    join clients c on c.id = p.client_id
    where c.agency_id in (select user_agency_ids())
  ))
  with check (content_item_id in (
    select ci.id from content_items ci
    join projects p on p.id = ci.project_id
    join clients c on c.id = p.client_id
    where c.agency_id in (select user_agency_ids())
  ));

-- =========================================================================
-- Auto-updated_at trigger
-- =========================================================================
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
