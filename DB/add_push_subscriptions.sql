-- ============================================================
-- NekoMap プッシュ通知購読テーブル 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 概要:
--   チャットの新着メッセージをプッシュ通知するための、
--   ブラウザごとの購読情報（endpoint/鍵）を保存するテーブル。
--   1ユーザーが複数の端末・ブラウザで通知を有効にできるよう、
--   endpoint単位で複数行持てるようにしている。
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "本人のみ登録可能" on public.push_subscriptions;
create policy "本人のみ登録可能"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "本人のみ更新可能" on public.push_subscriptions;
create policy "本人のみ更新可能"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

drop policy if exists "本人のみ閲覧可能" on public.push_subscriptions;
create policy "本人のみ閲覧可能"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "本人のみ削除可能" on public.push_subscriptions;
create policy "本人のみ削除可能"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- 確認
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'push_subscriptions'
order by cmd;
