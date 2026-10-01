-- =========================================================
-- apnadairy · module 1b · verification documents
-- run in supabase sql editor (after 01_user_management.sql)
-- =========================================================

-- ---------- storage bucket (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs', 'verification-docs', false, 5242880,          -- 5 mb max
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- ---------- document types ----------
create type document_type as enum (
  'cnic_front',
  'cnic_back',
  'business_registration',   -- secp / chamber / municipal licence
  'ntn_certificate',
  'bank_statement',
  'utility_bill',            -- of the center / shop premises
  'shop_photo',
  'other'
);

-- ---------- documents table ----------
create table public.verification_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  doc_type    document_type not null,
  file_path   text not null unique,         -- path inside the bucket: <user_id>/<file>
  file_name   text not null,
  mime_type   text,
  size_bytes  integer,
  uploaded_at timestamptz not null default now()
);

create index on public.verification_documents (user_id);

alter table public.verification_documents enable row level security;

create policy "docs: read own or admin" on public.verification_documents
  for select using (user_id = auth.uid() or public.is_admin());

create policy "docs: insert own" on public.verification_documents
  for insert with check (user_id = auth.uid());

-- users can remove their own docs only while not yet approved
create policy "docs: delete own while pending" on public.verification_documents
  for delete using (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status <> 'active')
  );

-- ---------- storage policies (files live in folder = user id) ----------
create policy "storage: upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: read own or admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "storage: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- approval rule: area managers need documents ----------
-- cnic front + at least one proof of the center/business
create or replace function public.has_required_docs(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    exists (select 1 from public.verification_documents where user_id = p_user and doc_type = 'cnic_front')
    and exists (select 1 from public.verification_documents where user_id = p_user
                and doc_type in ('business_registration', 'ntn_certificate', 'bank_statement', 'utility_bill', 'shop_photo'));
$$;

create or replace function public.set_verification(
  p_kind   text,
  p_id     uuid,
  p_status account_status,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'only super admin can do this';
  end if;

  if p_kind = 'area_manager' then
    select user_id into v_user from public.area_managers where id = p_id;
    if v_user is null then raise exception 'record not found'; end if;

    if p_status = 'active' and not public.has_required_docs(v_user) then
      raise exception 'cannot approve: cnic front and a business/center proof document are required';
    end if;

    update public.area_managers
       set verification_status = p_status, verified_by = auth.uid(),
           verified_at = now(), rejection_reason = p_reason
     where id = p_id;

  elsif p_kind = 'business' then
    select user_id into v_user from public.business_profiles where id = p_id;
    if v_user is null then raise exception 'record not found'; end if;

    update public.business_profiles
       set verification_status = p_status, verified_by = auth.uid(),
           verified_at = now(), rejection_reason = p_reason
     where id = p_id;
  else
    raise exception 'unknown kind %', p_kind;
  end if;

  update public.profiles set status = p_status, updated_at = now() where id = v_user;
end;
$$;
