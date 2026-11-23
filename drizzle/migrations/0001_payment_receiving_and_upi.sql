alter table public.weddings add column receiving_mode text not null default 'by_side' check (receiving_mode in ('common','by_side'));

create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  side text not null check (side in ('common','bride','groom')),
  enabled boolean not null default false,
  beneficiary_name text,
  upi_vpa text check (upi_vpa is null or upi_vpa ~ '^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$'),
  bank_holder text,
  bank_account_enc text,
  bank_account_last4 text check (bank_account_last4 is null or bank_account_last4 ~ '^\d{4}$'),
  ifsc text check (ifsc is null or ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  bank_name text,
  notes text,
  show_bank_to_guests boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (wedding_id, side)
);
grant select (id, wedding_id, side, enabled, beneficiary_name, upi_vpa, bank_holder, bank_account_last4, ifsc, bank_name, notes, show_bank_to_guests, updated_by, updated_at) on public.payment_accounts to authenticated;
grant all on public.payment_accounts to service_role;
alter table public.payment_accounts enable row level security;
create policy "owner finance read receiving" on public.payment_accounts for select to authenticated
  using (public.has_wedding_role(wedding_id, array['wedding_owner','finance']::public.wedding_role[]));

create table public.upi_payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  side text not null check (side in ('bride','groom')),
  account_side text not null check (account_side in ('common','bride','groom')),
  payee_vpa text not null,
  payee_name text not null,
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  utr text check (utr is null or utr ~ '^[A-Za-z0-9]{6,30}$'),
  proof_path text,
  status text not null default 'awaiting_bank_confirmation' check (status in ('awaiting_bank_confirmation','verified','rejected')),
  verified_by uuid, verified_at timestamptz, verify_note text,
  created_at timestamptz not null default now()
);
grant select on public.upi_payments to authenticated;
grant all on public.upi_payments to service_role;
alter table public.upi_payments enable row level security;
create policy "finance read upi" on public.upi_payments for select to authenticated using (
  public.has_wedding_role(wedding_id, array['wedding_owner','finance']::public.wedding_role[])
  or (side='bride' and public.has_wedding_role(wedding_id, array['bride_admin']::public.wedding_role[]))
  or (side='groom' and public.has_wedding_role(wedding_id, array['groom_admin']::public.wedding_role[])));

create or replace function public.verify_upi_payment(_id uuid, _status text, _note text) returns void
language plpgsql security definer set search_path = public as $$
declare _w uuid;
begin
  if _status not in ('verified','rejected','awaiting_bank_confirmation') then raise exception 'invalid status'; end if;
  select wedding_id into _w from upi_payments where id = _id;
  if _w is null or not public.has_wedding_role(_w, array['wedding_owner','finance']::public.wedding_role[]) then raise exception 'forbidden'; end if;
  update upi_payments set status = _status, verify_note = left(_note, 300),
    verified_by = case when _status = 'awaiting_bank_confirmation' then null else auth.uid() end,
    verified_at = case when _status = 'awaiting_bank_confirmation' then null else now() end
  where id = _id;
  insert into activity_log(wedding_id, actor, action, detail) values (_w, auth.uid(), 'upi_' || _status, 'UPI record ' || _id || coalesce(' — ' || left(_note, 200), ''));
end $$;
grant execute on function public.verify_upi_payment(uuid, text, text) to authenticated;