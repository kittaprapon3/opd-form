-- =====================================================================
--  แบบขอมีเวชระเบียนผู้ป่วยนอก (ออนไลน์) — ตั้งค่าฐานข้อมูล Supabase
--  วางทั้งไฟล์ใน  SQL Editor  แล้วกด Run  (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
-- =====================================================================

-- ---------- ตารางคำขอ ----------
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  ref         text unique not null,                 -- เลขที่คำขอ เช่น 691118-001
  created_at  timestamptz not null default now(),
  status      text not null default 'รอดำเนินการ'
              check (status in ('รอดำเนินการ','ออก HN แล้ว','ข้อมูลไม่ครบ/ติดต่อกลับ','ยกเลิก')),
  hn          text,
  note        text,
  cid         text not null,
  fullname    text not null,
  phone       text,
  data        jsonb not null,                       -- ข้อมูลทั้งหมดในแบบฟอร์ม + ลายเซ็น
  updated_at  timestamptz,
  updated_by  text
);
create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_cid_idx     on public.requests (cid);

-- ---------- รายชื่อเจ้าหน้าที่ที่ดูข้อมูลได้ ----------
create table if not exists public.staff (
  email text primary key,
  name  text
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- สิทธิ์ (Row Level Security) ----------
alter table public.requests enable row level security;
alter table public.staff    enable row level security;

revoke all on public.requests from anon, authenticated;
revoke all on public.staff    from anon, authenticated;
grant select, update on public.requests to authenticated;
grant select         on public.staff    to authenticated;

drop policy if exists staff_read   on public.requests;
drop policy if exists staff_update on public.requests;
drop policy if exists staff_self   on public.staff;
create policy staff_read   on public.requests for select to authenticated using (public.is_staff());
create policy staff_update on public.requests for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy staff_self   on public.staff    for select to authenticated using (public.is_staff());

-- เจ้าหน้าที่แก้ได้เฉพาะ สถานะ / HN / หมายเหตุ
revoke update on public.requests from authenticated;
grant  update (status, hn, note) on public.requests to authenticated;

create or replace function public.requests_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $$;
drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests
  for each row execute function public.requests_touch();

-- ---------- ช่องทางเดียวที่คนไข้ส่งข้อมูลได้ ----------
-- คนไข้ (anon) ไม่มีสิทธิ์อ่าน/แก้ตารางเลย ทำได้แค่เรียกฟังก์ชันนี้ ซึ่งตรวจข้อมูลก่อนบันทึก
create or replace function public.submit_request(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_cid   text := regexp_replace(coalesce(payload->>'cid',''), '\D', '', 'g');
  v_sum   int := 0;
  -- ปี พ.ศ. 2 หลัก + เดือน + วัน เช่น 691118
  v_day   text := lpad((((extract(year from now() at time zone 'Asia/Bangkok'))::int + 543) % 100)::text, 2, '0')
                  || to_char(now() at time zone 'Asia/Bangkok', 'MMDD');
  v_seq   int;
  v_ref   text;
  v_recent int;
  i int;
begin
  -- ตรวจขนาดและข้อมูลจำเป็น
  if octet_length(payload::text) > 300000 then raise exception 'ข้อมูลมีขนาดใหญ่เกินไป'; end if;
  if length(v_cid) <> 13 then raise exception 'เลขบัตรประชาชนไม่ถูกต้อง'; end if;
  for i in 1..12 loop v_sum := v_sum + substr(v_cid, i, 1)::int * (14 - i); end loop;
  if (11 - v_sum % 11) % 10 <> substr(v_cid, 13, 1)::int then raise exception 'เลขบัตรประชาชนไม่ถูกต้อง'; end if;
  if coalesce(trim(payload->>'fname'),'') = '' or coalesce(trim(payload->>'lname'),'') = '' then
    raise exception 'กรุณากรอกชื่อ-นามสกุล'; end if;
  if coalesce(trim(payload->>'phone'),'') = '' then raise exception 'กรุณากรอกเบอร์โทรศัพท์'; end if;
  if coalesce(payload->>'signature','') not like 'data:image/png;base64,%' then raise exception 'ไม่พบลายเซ็น'; end if;

  -- จำกัดอัตรา: ทั้งระบบไม่เกิน 30 คำขอ/นาที และเลขบัตรเดียวกันไม่เกิน 3 ครั้ง/ชั่วโมง
  select count(*) into v_recent from public.requests where created_at > now() - interval '1 minute';
  if v_recent >= 30 then raise exception 'มีผู้ใช้งานจำนวนมาก กรุณาลองใหม่ในอีกสักครู่'; end if;
  select count(*) into v_recent from public.requests where cid = v_cid and created_at > now() - interval '1 hour';
  if v_recent >= 3 then raise exception 'เลขบัตรนี้ส่งคำขอแล้ว กรุณาติดต่อเจ้าหน้าที่'; end if;

  -- เลขที่คำขอเรียงตามวัน: YYMMDD-001
  perform pg_advisory_xact_lock(hashtext('opd_ref_' || v_day));
  select coalesce(max(split_part(ref, '-', 2)::int), 0) + 1 into v_seq
    from public.requests where ref like v_day || '-%';
  v_ref := v_day || '-' || lpad(v_seq::text, 3, '0');

  insert into public.requests (ref, cid, fullname, phone, data)
  values (v_ref, v_cid,
          left(coalesce(payload->>'fullname', (payload->>'fname') || ' ' || (payload->>'lname')), 200),
          left(payload->>'phone', 30),
          payload - 'cid' || jsonb_build_object('cid', v_cid));
  return v_ref;
end $$;

revoke all on function public.submit_request(jsonb) from public;
grant execute on function public.submit_request(jsonb) to anon, authenticated;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.requests_touch() from public, anon, authenticated;

-- =====================================================================
--  เพิ่มอีเมลเจ้าหน้าที่ (แก้แล้วรันเฉพาะบรรทัดนี้ได้ทุกเมื่อ)
-- =====================================================================
-- insert into public.staff (email, name) values
--   ('staff1@example.com', 'ชื่อเจ้าหน้าที่ 1'),
--   ('staff2@example.com', 'ชื่อเจ้าหน้าที่ 2')
-- on conflict (email) do nothing;

-- =====================================================================
--  (เพิ่มเติม) ชื่อผู้พิมพ์ของเจ้าหน้าที่ + บันทึกการพิมพ์
-- =====================================================================
alter table public.requests add column if not exists printed_at timestamptz;
alter table public.requests add column if not exists printed_by text;
alter table public.requests add column if not exists print_count int not null default 0;

create or replace function public.my_profile() returns table(email text, name text)
language sql stable security definer set search_path = public as $$
  select s.email, s.name from public.staff s
  where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email',''));
$$;

create or replace function public.set_my_name(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_name,'')), 100);
begin
  if not public.is_staff() then raise exception 'ไม่มีสิทธิ์'; end if;
  if v = '' then raise exception 'กรุณาใส่ชื่อ'; end if;
  update public.staff set name = v where lower(email) = lower(auth.jwt() ->> 'email');
  return v;
end $$;

create or replace function public.mark_printed(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_who text;
begin
  if not public.is_staff() then raise exception 'ไม่มีสิทธิ์'; end if;
  select coalesce(nullif(s.name,''), s.email) into v_who from public.staff s
   where lower(s.email) = lower(auth.jwt() ->> 'email');
  update public.requests set printed_at = now(), printed_by = v_who, print_count = print_count + 1 where id = p_id;
end $$;

-- การพิมพ์ไม่นับเป็น "แก้ไข"
create or replace function public.requests_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status or new.hn is distinct from old.hn or new.note is distinct from old.note then
    new.updated_at := now();
    new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  end if;
  return new;
end $$;

revoke all on function public.my_profile() from public, anon;
revoke all on function public.set_my_name(text) from public, anon;
revoke all on function public.mark_printed(uuid) from public, anon;
revoke all on function public.requests_touch() from public, anon, authenticated;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.set_my_name(text) to authenticated;
grant execute on function public.mark_printed(uuid) to authenticated;

-- =====================================================================
--  (เพิ่มเติม) แบบฟอร์มหลายฉบับ (template) และการแก้ข้อมูลคนไข้โดยเจ้าหน้าที่
--  ดูรายละเอียดฟังก์ชันใน migration: form_templates, staff_edit_request_data
-- =====================================================================
-- form_templates(id, name, source_file, source_page, width_pt, height_pt, bg, fields jsonb, is_active, created_at, created_by)
--   anon อ่านได้เฉพาะ is_active, เจ้าหน้าที่อ่าน/เพิ่ม/แก้ได้, activate_template(uuid|null)
-- requests.edit_log jsonb  +  update_request_data(p_id uuid, p_data jsonb)  (แก้ได้เฉพาะช่องข้อมูล ไม่รวมลายเซ็น, บันทึกค่าเดิม-ค่าใหม่)
