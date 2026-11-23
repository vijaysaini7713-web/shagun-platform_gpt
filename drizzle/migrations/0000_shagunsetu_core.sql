create type public.wedding_role as enum ('wedding_owner','bride_admin','groom_admin','finance','counter_staff');

create table public.tenants (id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid, created_at timestamptz not null default now());
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null unique,
  bride_name text not null, groom_name text not null,
  event_date date, venue text,
  is_demo boolean not null default false,
  payment_routing text not null default 'by_side' check (payment_routing in ('by_side','bride_only','groom_only')),
  bride_receiver_label text not null default 'Bride family account (DEMO)',
  groom_receiver_label text not null default 'Groom family account (DEMO)',
  allow_digital boolean not null default true,
  welcome_message text,
  created_at timestamptz not null default now()
);
create table public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null, email text,
  role public.wedding_role not null,
  created_at timestamptz not null default now(),
  unique (wedding_id, user_id, role)
);
create table public.counters (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade, name text not null, side text not null default 'both' check (side in ('bride','groom','both')), created_at timestamptz not null default now());
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  side text not null check (side in ('bride','groom')),
  relation text not null, name text not null, phone text not null,
  ref_code text not null unique,
  created_at timestamptz not null default now()
);
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  side text not null check (side in ('bride','groom')),
  kind text not null check (kind in ('physical','envelope')),
  description text, photo_path text, amount numeric(12,2),
  status text not null default 'declared' check (status in ('declared','received','handed_over')),
  counter_id uuid references public.counters(id) on delete set null,
  received_by uuid, received_at timestamptz,
  handed_to text, handed_over_at timestamptz, notes text,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  side text not null check (side in ('bride','groom')),
  routed_to text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null check (status in ('success','failed','pending')),
  is_sandbox boolean not null default true check (is_sandbox),
  sandbox_ref text not null,
  created_at timestamptz not null default now()
);
create table public.activity_log (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings(id) on delete cascade, actor uuid, action text not null, detail text, created_at timestamptz not null default now());

grant select, insert, update, delete on public.tenants, public.weddings, public.wedding_members, public.counters, public.guests, public.gifts, public.activity_log to authenticated;
grant select on public.payments to authenticated;
grant all on public.tenants, public.weddings, public.wedding_members, public.counters, public.guests, public.gifts, public.payments, public.activity_log to service_role;

alter table public.tenants enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.counters enable row level security;
alter table public.guests enable row level security;
alter table public.gifts enable row level security;
alter table public.payments enable row level security;
alter table public.activity_log enable row level security;

create or replace function public.is_tenant_owner_of_wedding(_w uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from weddings w join tenants t on t.id = w.tenant_id where w.id = _w and t.owner_id = auth.uid())
$$;
create or replace function public.has_wedding_role(_w uuid, _roles public.wedding_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_tenant_owner_of_wedding(_w) or exists (select 1 from wedding_members m where m.wedding_id = _w and m.user_id = auth.uid() and m.role = any(_roles))
$$;
create or replace function public.is_wedding_member(_w uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_tenant_owner_of_wedding(_w) or exists (select 1 from wedding_members m where m.wedding_id = _w and m.user_id = auth.uid())
$$;
create or replace function public.can_see_side(_w uuid, _side text) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_wedding_role(_w, array['wedding_owner','finance','counter_staff']::public.wedding_role[])
    or (_side = 'bride' and public.has_wedding_role(_w, array['bride_admin']::public.wedding_role[]))
    or (_side = 'groom' and public.has_wedding_role(_w, array['groom_admin']::public.wedding_role[]))
$$;

create policy "owner reads tenant" on public.tenants for select to authenticated using (owner_id = auth.uid());
create policy "owner updates tenant" on public.tenants for update to authenticated using (owner_id = auth.uid());

create policy "members read wedding" on public.weddings for select to authenticated using (public.is_wedding_member(id));
create policy "owners update wedding" on public.weddings for update to authenticated using (public.has_wedding_role(id, array['wedding_owner']::public.wedding_role[]));

create policy "members read team" on public.wedding_members for select to authenticated using (public.is_wedding_member(wedding_id));
create policy "owners add team" on public.wedding_members for insert to authenticated with check (public.has_wedding_role(wedding_id, array['wedding_owner']::public.wedding_role[]));
create policy "owners remove team" on public.wedding_members for delete to authenticated using (public.has_wedding_role(wedding_id, array['wedding_owner']::public.wedding_role[]));

create policy "members read counters" on public.counters for select to authenticated using (public.is_wedding_member(wedding_id));
create policy "owners manage counters" on public.counters for all to authenticated using (public.has_wedding_role(wedding_id, array['wedding_owner']::public.wedding_role[])) with check (public.has_wedding_role(wedding_id, array['wedding_owner']::public.wedding_role[]));

create policy "side read guests" on public.guests for select to authenticated using (public.can_see_side(wedding_id, side));
create policy "staff add guests" on public.guests for insert to authenticated with check (public.has_wedding_role(wedding_id, array['wedding_owner','counter_staff']::public.wedding_role[]));

create policy "side read gifts" on public.gifts for select to authenticated using (public.can_see_side(wedding_id, side));
create policy "staff update gifts" on public.gifts for update to authenticated using (public.has_wedding_role(wedding_id, array['wedding_owner','counter_staff']::public.wedding_role[]) or (public.can_see_side(wedding_id, side) and public.has_wedding_role(wedding_id, array['bride_admin','groom_admin']::public.wedding_role[])));
create policy "staff add gifts" on public.gifts for insert to authenticated with check (public.has_wedding_role(wedding_id, array['wedding_owner','counter_staff']::public.wedding_role[]));

create policy "finance read payments" on public.payments for select to authenticated using (
  public.has_wedding_role(wedding_id, array['wedding_owner','finance']::public.wedding_role[])
  or (side='bride' and public.has_wedding_role(wedding_id, array['bride_admin']::public.wedding_role[]))
  or (side='groom' and public.has_wedding_role(wedding_id, array['groom_admin']::public.wedding_role[])));

create policy "members read log" on public.activity_log for select to authenticated using (public.has_wedding_role(wedding_id, array['wedding_owner','finance','bride_admin','groom_admin']::public.wedding_role[]));
create policy "members write log" on public.activity_log for insert to authenticated with check (public.is_wedding_member(wedding_id) and actor = auth.uid());

create or replace function public.create_wedding(_bride text, _groom text, _slug text, _date date, _venue text) returns uuid language plpgsql security definer set search_path = public as $$
declare _t uuid; _w uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _slug !~ '^[a-z0-9-]{3,40}$' then raise exception 'invalid slug'; end if;
  select id into _t from tenants where owner_id = auth.uid() limit 1;
  if _t is null then insert into tenants(name, owner_id) values (_bride || ' & ' || _groom || ' family', auth.uid()) returning id into _t; end if;
  insert into weddings(tenant_id, slug, bride_name, groom_name, event_date, venue) values (_t, _slug, _bride, _groom, _date, _venue) returning id into _w;
  insert into wedding_members(wedding_id, user_id, email, role) values (_w, auth.uid(), auth.jwt()->>'email', 'wedding_owner');
  insert into counters(wedding_id, name, side) values (_w, 'Main counter', 'both');
  return _w;
end $$;
grant execute on function public.create_wedding(text,text,text,date,text) to authenticated;

create or replace function public.join_demo_wedding(_role public.wedding_role) returns uuid language plpgsql security definer set search_path = public as $$
declare _w uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into _w from weddings where is_demo and slug = 'demo-wedding';
  delete from wedding_members where wedding_id = _w and user_id = auth.uid();
  insert into wedding_members(wedding_id, user_id, email, role) values (_w, auth.uid(), auth.jwt()->>'email', _role);
  return _w;
end $$;
grant execute on function public.join_demo_wedding(public.wedding_role) to authenticated;

create or replace function public.add_member_by_email(_w uuid, _email text, _role public.wedding_role) returns void language plpgsql security definer set search_path = public, auth as $$
declare _u uuid;
begin
  if not public.has_wedding_role(_w, array['wedding_owner']::public.wedding_role[]) then raise exception 'forbidden'; end if;
  select id into _u from auth.users where lower(email) = lower(_email);
  if _u is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  insert into wedding_members(wedding_id, user_id, email, role) values (_w, _u, lower(_email), _role) on conflict do nothing;
end $$;
grant execute on function public.add_member_by_email(uuid,text,public.wedding_role) to authenticated;

create policy "members read gift photos" on storage.objects for select to authenticated using (bucket_id = 'gift-photos' and public.is_wedding_member(((storage.foldername(name))[1])::uuid));

insert into public.tenants(id, name) values ('00000000-0000-0000-0000-000000000001', 'ShagunSetu Demo Tenant');
insert into public.weddings(id, tenant_id, slug, bride_name, groom_name, event_date, venue, is_demo, welcome_message)
values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','demo-wedding','Ananya','Aarav','2026-12-12','Demo Palace, Jaipur (fictional)', true, 'Aapke aashirwad ke liye dhanyavaad! Thank you for blessing us.');
insert into public.counters(id, wedding_id, name, side) values
('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','Bride side counter','bride'),
('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','Groom side counter','groom');
insert into public.guests(wedding_id, side, relation, name, phone, ref_code) values
('00000000-0000-0000-0000-0000000000a1','bride','Mama / Uncle','Test Guest Ramesh Sharma','9000000001','DEMO-R1A2K9'),
('00000000-0000-0000-0000-0000000000a1','bride','Friend','Test Guest Priya Verma','9000000002','DEMO-P7Q3M2'),
('00000000-0000-0000-0000-0000000000a1','bride','Colleague','Test Guest Kavita Joshi','9000000003','DEMO-K4T8L1'),
('00000000-0000-0000-0000-0000000000a1','groom','Chacha / Uncle','Test Guest Suresh Gupta','9000000004','DEMO-S2W6N5'),
('00000000-0000-0000-0000-0000000000a1','groom','Friend','Test Guest Rohan Mehta','9000000005','DEMO-R9X1B7'),
('00000000-0000-0000-0000-0000000000a1','groom','Neighbour','Test Guest Neha Kapoor','9000000006','DEMO-N3Z5C8');
insert into public.gifts(wedding_id, guest_id, side, kind, description, amount, status, counter_id, received_at, handed_to, handed_over_at)
select g.wedding_id, g.id, g.side, x.kind, x.descr, x.amount, x.status,
  case when g.side='bride' then '00000000-0000-0000-0000-0000000000c1'::uuid else '00000000-0000-0000-0000-0000000000c2'::uuid end,
  case when x.status <> 'declared' then now() - interval '2 hours' end,
  case when x.status = 'handed_over' then 'Demo family elder' end,
  case when x.status = 'handed_over' then now() - interval '1 hour' end
from public.guests g join (values
 ('DEMO-R1A2K9','envelope','Shagun envelope',5100::numeric,'handed_over'),
 ('DEMO-R1A2K9','physical','Silver puja thali',null,'received'),
 ('DEMO-P7Q3M2','physical','Dinner set (boxed)',null,'declared'),
 ('DEMO-K4T8L1','envelope','Envelope',null,'received'),
 ('DEMO-S2W6N5','envelope','Shagun envelope',11000,'received'),
 ('DEMO-R9X1B7','physical','Wall clock',null,'declared'),
 ('DEMO-N3Z5C8','envelope','Envelope',2100,'declared')
) as x(ref, kind, descr, amount, status) on x.ref = g.ref_code;
insert into public.payments(wedding_id, guest_id, side, routed_to, amount, status, sandbox_ref)
select g.wedding_id, g.id, g.side, case when g.side='bride' then 'Bride family account (DEMO)' else 'Groom family account (DEMO)' end, x.amount, x.status, x.sref
from public.guests g join (values
 ('DEMO-P7Q3M2',2100::numeric,'success','SBX-1001'),
 ('DEMO-K4T8L1',1100,'pending','SBX-1002'),
 ('DEMO-R9X1B7',5100,'success','SBX-1003'),
 ('DEMO-N3Z5C8',501,'failed','SBX-1004')
) as x(ref, amount, status, sref) on x.ref = g.ref_code;
insert into public.activity_log(wedding_id, action, detail) values
('00000000-0000-0000-0000-0000000000a1','seed','Demo wedding seeded with fictional test records');