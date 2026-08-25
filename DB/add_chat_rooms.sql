-- ============================================================
-- NekoMap 投稿者へのメッセージ機能（1対1チャット）追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   掲示板の投稿詳細ページから、投稿者に直接コンタクトを取れるように
--   するため、「誰と誰の会話か」を管理する chat_rooms テーブルを追加する。
--
--   あわせて、既存の chats テーブルのRLSを
--   「ログイン済みなら誰でも閲覧・投稿可能」から
--   「その会話の当事者2人のみ閲覧・投稿可能」に厳格化する。
--   ※現状のポリシーのままだと、room_id（会話のID）さえ分かれば
--     他人同士の会話でも閲覧できてしまうため、今回メッセージ機能の
--     入り口を新設するにあたり、あわせて修正する。
-- ============================================================

-- 1. チャットルーム（会話の当事者2人）を管理するテーブル
create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references public.users(id),
  user_b uuid not null references public.users(id),
  created_at timestamp default now()
);

-- 同じ2人の組み合わせで複数の部屋ができないようにする（並び順を問わない一意制約）
create unique index if not exists chat_rooms_pair_idx
  on public.chat_rooms (least(user_a, user_b), greatest(user_a, user_b));

alter table public.chat_rooms enable row level security;

drop policy if exists "当事者のみ閲覧可能" on public.chat_rooms;
create policy "当事者のみ閲覧可能"
  on public.chat_rooms for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "当事者として作成可能" on public.chat_rooms;
create policy "当事者として作成可能"
  on public.chat_rooms for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- 2. chats テーブルのRLSを厳格化（当事者のみ閲覧・投稿可能に）
drop policy if exists "ログイン済みユーザーが閲覧可能" on public.chats;
drop policy if exists "当事者のみ閲覧可能" on public.chats;
create policy "当事者のみ閲覧可能"
  on public.chats for select
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chats.room_id
        and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  );

drop policy if exists "ログイン済みユーザーが投稿可能" on public.chats;
drop policy if exists "当事者のみ投稿可能" on public.chats;
create policy "当事者のみ投稿可能"
  on public.chats for insert
  with check (
    auth.uid() = sender
    and exists (
      select 1 from public.chat_rooms r
      where r.id = chats.room_id
        and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  );

-- 確認
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename in ('chat_rooms', 'chats')
order by tablename, cmd;
