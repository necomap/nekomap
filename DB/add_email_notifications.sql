-- ============================================================
-- NekoMap メール通知の有効/無効フラグ 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 概要: メール通知はプッシュ通知と違って本人の許可なく届いてしまう
--   （ブラウザの許可ダイアログのような仕組みがない）ため、
--   デフォルトはOFF（オプトイン）にしておく。
-- ============================================================

alter table public.users add column if not exists email_notifications_enabled boolean default false;

-- 確認
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'users' and column_name = 'email_notifications_enabled';
