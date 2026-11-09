-- Supabase 대시보드 → SQL Editor에서 한 번 실행하세요.
create table if not exists public.guestbook (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 20),
  message text not null check (char_length(message) between 1 and 300),
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists guestbook_created_at_idx on public.guestbook (created_at desc);
create index if not exists guestbook_ip_hash_idx on public.guestbook (ip_hash, created_at desc);

-- RLS를 켜고 정책을 만들지 않으면 anon 키로는 읽기/쓰기가 모두 막힙니다.
-- 모든 접근은 Vercel Function(service role 키)을 통해서만 이뤄집니다.
alter table public.guestbook enable row level security;
