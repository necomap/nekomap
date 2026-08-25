-- ============================================================
-- NekoMap TNR記録の削除許可SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景: 猫詳細画面のTNR記録に「編集」「削除」ボタンを追加したが、
--   tnr_schedules テーブルには削除(delete)を許可するRLSポリシーが
--   まだ無かった（更新のみ許可されていた）。このままだと削除ボタンを
--   押しても実際には削除されない（ポリシーが無い操作はRLSで
--   静かにブロックされる）ため、更新ポリシーと同様に
--   「ログイン済みユーザーなら削除可能」を追加する。
--   ※ ナワバリ(territories)やTNR更新と同じく、複数のボランティアが
--     同じ猫の記録を協力して管理する運用を想定した設計。
-- ============================================================

drop policy if exists "ログイン済みユーザーが削除可能" on public.tnr_schedules;
create policy "ログイン済みユーザーが削除可能"
  on public.tnr_schedules for delete
  using (auth.uid() is not null);

-- 確認
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'tnr_schedules';
