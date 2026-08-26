-- ============================================================
-- NekoMap 旧・重複RLSポリシーの整理SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   secure_cat_spots_rls.sql / secure_trouble_reports_rls.sql を
--   実行した後の確認で、以前から存在していた別名の緩いポリシーが
--   一部残っていることが判明した。
--
--   PostgreSQLのRLSは「同じ操作（SELECT/INSERT/UPDATE/DELETE）に
--   複数のポリシーがある場合、どれか1つでも条件を満たせば許可される
--   （OR条件で合成される）」という仕様のため、古い緩いポリシーが
--   残ったままだと、新しく絞ったポリシーがあっても実質的に
--   無効化されてしまう。
--
--   特に trouble_reports の「ログイン済みユーザーが更新可能」
--  （条件:true）は、"対応者・未対応時のみ更新可" という今回の制限を
--   完全に無力化してしまっていたため、最優先で削除する。
-- ============================================================

-- 【重要】trouble_reports: 「誰でも更新可能」だった古いポリシーを削除
--   これが残っていたため、対応者以外の誰でも困りごと投稿のステータスや
--   対応者情報を書き換えられる状態になっていた
drop policy if exists "ログイン済みユーザーが更新可能" on public.trouble_reports;

-- cat_spots: 重複していた古いINSERTポリシーを削除（実害はないが整理のため）
drop policy if exists "ログイン済みユーザーが投稿可能" on public.cat_spots;

-- trouble_reports: 重複していた古いINSERTポリシーを削除（実害はないが整理のため）
drop policy if exists "ログイン済みユーザーが投稿可能" on public.trouble_reports;

-- 確認: 整理後、各テーブルのポリシーが想定通り1操作1ポリシーになっているか
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('cat_spots', 'trouble_reports')
order by tablename, cmd, policyname;
