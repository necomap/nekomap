-- ============================================================
-- NekoMap お気に入り（ブックマーク）機能 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--（2026-09-28にSupabase MCP経由で本番へ適用済み。将来の環境再構築用に記録）
--
-- 背景:
--   困りごと・里親募集・ボランティア募集・掲示板の投稿を、あとで見返せる
--   ように保存しておきたいというユーザーからの依頼で追加。
--
-- 方針:
--   汎用のfavoritesテーブル（target_table + target_idで対象を指定）を新設。
--   本人のみ自分のお気に入りを閲覧・追加・削除できる。
-- ============================================================

create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_table text not null check (target_table in ('trouble_reports', 'adoptions', 'volunteer_requests', 'posts')),
  target_id uuid not null,
  created_at timestamp default now(),
  unique (user_id, target_table, target_id)
);

alter table public.favorites enable row level security;

drop policy if exists "本人のお気に入りのみ閲覧可能" on public.favorites;
create policy "本人のお気に入りのみ閲覧可能"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "本人がお気に入り追加可能" on public.favorites;
create policy "本人がお気に入り追加可能"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "本人がお気に入り削除可能" on public.favorites;
create policy "本人がお気に入り削除可能"
  on public.favorites for delete
  using (auth.uid() = user_id);

create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists favorites_target_idx on public.favorites (target_table, target_id);

-- 確認
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'favorites'
order by cmd;
