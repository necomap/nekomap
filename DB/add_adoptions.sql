-- ============================================================
-- NekoMap 里親募集機能 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--（2026-09-27にSupabase MCP経由で本番へ適用済み。将来の環境再構築用に記録）
--
-- 背景:
--   地域猫の中で新しい飼い主を探している猫の情報（負担金額含む）を
--   公開し、一般ユーザー（未ログインでも閲覧可）が里親希望として
--   投稿者にコンタクトできるようにする。
--
-- 方針:
--   閲覧・地図表示は誰でも可能（未ログインでも可）。
--   投稿はログイン必須。コンタクトは既存のチャット機能（chat_rooms/chats）
--   を再利用するため、未ログインユーザーは自然にログイン画面へ誘導される
--   （新しい匿名コンタクト用の仕組みは作らない）。
-- ============================================================

create table if not exists public.adoptions (
  id uuid primary key default uuid_generate_v4(),
  cat_id uuid references public.cats(id),
  name text not null,
  photo text,
  sex text,
  neutered boolean default false,
  age_note text,
  features text,
  health_note text,
  description text,
  fee_amount integer default 0,
  fee_note text,
  lat double precision,
  lng double precision,
  status text not null default '募集中',
  created_by uuid not null references public.users(id),
  created_at timestamp default now()
);

alter table public.adoptions enable row level security;

drop policy if exists "誰でも閲覧可能" on public.adoptions;
create policy "誰でも閲覧可能"
  on public.adoptions for select
  using (true);

drop policy if exists "ログイン済みユーザーが投稿可能" on public.adoptions;
create policy "ログイン済みユーザーが投稿可能"
  on public.adoptions for insert
  with check (auth.uid() = created_by);

drop policy if exists "本人と管理者が更新可能" on public.adoptions;
create policy "本人と管理者が更新可能"
  on public.adoptions for update
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "本人と管理者が削除可能" on public.adoptions;
create policy "本人と管理者が削除可能"
  on public.adoptions for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create index if not exists adoptions_status_idx on public.adoptions (status);
create index if not exists adoptions_created_by_idx on public.adoptions (created_by);

-- 投稿数フェイルオープン対策（他テーブルと同様、1日5件まで）にadoptionsを追加
create or replace function public.check_post_limit(user_id uuid, table_name text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  post_count int;
  user_created timestamp;
  is_new_user boolean;
begin
  select created_at into user_created from users where id = user_id;
  is_new_user := (now() - user_created) < interval '30 days';

  if not is_new_user then
    return true;
  end if;

  if table_name = 'posts' then
    select count(*) into post_count from posts
    where created_by = user_id
    and created_at > now() - interval '1 day';
  elsif table_name = 'sightings' then
    select count(*) into post_count from sightings
    where created_by = user_id
    and created_at > now() - interval '1 day';
  elsif table_name = 'trouble_reports' then
    select count(*) into post_count from trouble_reports
    where created_by = user_id
    and created_at > now() - interval '1 day';
  elsif table_name = 'adoptions' then
    select count(*) into post_count from adoptions
    where created_by = user_id
    and created_at > now() - interval '1 day';
  end if;

  return post_count < 5;
end;
$function$;

-- 確認
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'adoptions'
order by cmd;
