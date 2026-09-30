-- ============================================================
-- NekoMap TNRカレンダー(tnr_schedules)の閲覧を活動者アカウント以上に制限するSQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- 前提: DB/fix_admin_rls_recursion.sql を先に実行し、public.is_admin() が
--       作成済みであること。
--
-- 背景:
--   「TNRカレンダーはユーザーごと？」という質問に対し、実際には
--   ユーザーごとではなく、ログイン済みであれば誰でも同じ内容が見える
--   全員共有の1つのカレンダーであることを確認した。
--   これに対し「見れるのは活動者以上に制限」との依頼を受け、閲覧のみを
--   活動者アカウント以上（活動者・団体・管理者）に制限する。
--   投稿（INSERT）・完了フラグの更新（UPDATE）は今回変更しない
--   （従来通りログイン済みユーザーなら誰でも可能）。
--
--   注意: tnr_schedulesの既存のSELECTポリシー名はこのリポジトリの
--   マイグレーション履歴に記録が残っていない（初期スキーマ作成時に
--   ダッシュボード上で直接作られたものと思われる）。名前を推測して
--   drop policyするのではなく、tnr_schedulesのSELECTポリシーを
--   すべて動的に洗い出して削除してから、新しいポリシーを1つだけ
--   作成する（PostgreSQLのRLSは複数ポリシーがOR合成されるため、
--   古い緩いポリシーが1つでも残っていると新しい制限が無効化されて
--   しまうことに注意）。
-- ------------------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'tnr_schedules' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.tnr_schedules', pol.policyname);
  end loop;
end $$;

create policy "活動者以上が閲覧可能"
  on public.tnr_schedules for select
  using (
    auth.uid() = created_by
    or public.is_admin()
    or exists (
      select 1 from public.users
      where id = auth.uid()
        and account_type in ('activist', 'organization')
    )
  );

-- ------------------------------------------------------------
-- 確認: 修正後のポリシー一覧（SELECTが1つだけになっていればOK）
-- ------------------------------------------------------------
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'tnr_schedules'
order by cmd;
