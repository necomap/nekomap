-- ============================================================
-- NekoMap 通知の個別設定 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 概要: どの種類の通知（チャット新着・訃報報告・困りごと対応）を
--   受け取るかを、ユーザーごとに設定できるようにする。
--   未設定（NULL）の項目はデフォルトON扱いにするので、
--   既存ユーザーもこのSQL実行だけで通知が届く状態のまま変わらない。
-- ============================================================

alter table public.users add column if not exists notification_preferences jsonb
  default '{"chat": true, "memorial_report": true, "trouble_response": true}'::jsonb;

-- 確認
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'users' and column_name = 'notification_preferences';
