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

-- 【重要】chats.room_id は text型・chats.sender は uuid型・chat_rooms.id/user_a/user_b は uuid型。
-- room_idとchat_rooms.idの比較、およびsender/user_a/user_bとauth.uid()の比較は
-- 型が食い違う（もしくは食い違う可能性がある）ため、実際に適用したバージョンでは
-- 両辺を::textキャストしてから比較している。以下はSupabaseに実際に適用済みの内容と
-- 一致させたもの（本ファイルの旧版は片側キャストのみで、これは実態と異なる誤りだった）。

drop policy if exists "当事者のみ閲覧可能" on public.chat_rooms;
create policy "当事者のみ閲覧可能"
  on public.chat_rooms for select
  using ((auth.uid())::text = (user_a)::text or (auth.uid())::text = (user_b)::text);

drop policy if exists "当事者として作成可能" on public.chat_rooms;
create policy "当事者として作成可能"
  on public.chat_rooms for insert
  with check ((auth.uid())::text = (user_a)::text or (auth.uid())::text = (user_b)::text);

-- 2. chats テーブルのRLSを厳格化（当事者のみ閲覧・投稿可能に）
drop policy if exists "ログイン済みユーザーが閲覧可能" on public.chats;
drop policy if exists "当事者のみ閲覧可能" on public.chats;
create policy "当事者のみ閲覧可能"
  on public.chats for select
  using (
    exists (
      select 1 from public.chat_rooms r
      where (r.id)::text = chats.room_id
        and ((r.user_a)::text = (auth.uid())::text or (r.user_b)::text = (auth.uid())::text)
    )
  );

drop policy if exists "ログイン済みユーザーが投稿可能" on public.chats;
drop policy if exists "当事者のみ投稿可能" on public.chats;
create policy "当事者のみ投稿可能"
  on public.chats for insert
  with check (
    (auth.uid())::text = (sender)::text
    and exists (
      select 1 from public.chat_rooms r
      where (r.id)::text = chats.room_id
        and ((r.user_a)::text = (auth.uid())::text or (r.user_b)::text = (auth.uid())::text)
    )
  );

-- 確認
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename in ('chat_rooms', 'chats')
order by tablename, cmd;
