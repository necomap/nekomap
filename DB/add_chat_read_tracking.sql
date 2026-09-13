-- ============================================================
-- NekoMap チャット既読管理 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 概要: チャット一覧ページ（未読表示）のために、
--   各会話を最後にいつ開いたか（当事者2人それぞれ）を
--   chat_roomsに保存できるようにする。
-- ============================================================

alter table public.chat_rooms add column if not exists last_read_at_a timestamp;
alter table public.chat_rooms add column if not exists last_read_at_b timestamp;

-- add_chat_rooms.sql実行時にはUPDATEポリシーを作っていなかったため、
-- このままだと既読日時の更新がRLSでブロックされてしまう。追加する。
drop policy if exists "当事者が既読情報を更新可能" on public.chat_rooms;
create policy "当事者が既読情報を更新可能"
  on public.chat_rooms for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- 確認
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'chat_rooms';

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'chat_rooms'
order by cmd;
