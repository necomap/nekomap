-- ============================================================
-- NekoMap 困りごとマップ（trouble_reports）のRLS整備SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   trouble_reportsテーブルには、これまでRLS（行単位のアクセス制御）を
--   設定した形跡がなかった。SupabaseのテーブルはRLSを有効にしない限り
--   「匿名キーを知っていれば誰でも何でもできる」状態になるため、
--   もしRLSが無効のままだった場合、誰でも他人の困りごと投稿を
--   書き換えたり削除したりできてしまう可能性がある。
--
--   困りごとマップ自体は「誰でも見て・誰でも対応を名乗り出られる」
--   公開の仕組みなので閲覧は引き続き全員に許可しつつ、
--   更新・削除だけを適切な人に絞る。
-- ============================================================

-- 事前確認: 現在の状態とポリシーを確認
select relrowsecurity as rls_enabled
from pg_class
where relname = 'trouble_reports' and relnamespace = 'public'::regnamespace;

select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'trouble_reports';
-- ↑ もし上のRLS確認で rls_enabled が false のまま既に運用していた場合、
--   これまで匿名キーで誰でも全件操作できていた可能性があります。
--   下記を実行して速やかに閉じてください。
--   （既存の緩いポリシーが別名で残っている場合は、そのポリシー名で
--    drop policy "名前" on public.trouble_reports; を先に実行してください）

alter table public.trouble_reports enable row level security;

-- 閲覧: 誰でも閲覧可能（公開の困りごとマップのため）
drop policy if exists "誰でも閲覧可能" on public.trouble_reports;
create policy "誰でも閲覧可能"
  on public.trouble_reports for select
  using (true);

-- 投稿: 誰でも報告できる（未ログインでも困りごと報告できる運用のため、
--   created_byが空、または本人IDのどちらも許可）
drop policy if exists "誰でも報告可能" on public.trouble_reports;
create policy "誰でも報告可能"
  on public.trouble_reports for insert
  with check (created_by is null or auth.uid() = created_by);

-- 更新: 対応者本人（対応中にする／解決にする／キャンセルする）・
--   まだ誰も対応していない案件に名乗り出る人・管理者のみ
drop policy if exists "対応者・未対応時は誰でも・管理者が更新可能" on public.trouble_reports;
create policy "対応者・未対応時は誰でも・管理者が更新可能"
  on public.trouble_reports for update
  using (
    auth.uid() = volunteer_id
    or volunteer_id is null
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 削除: 管理者のみ
drop policy if exists "管理者のみ削除可能" on public.trouble_reports;
create policy "管理者のみ削除可能"
  on public.trouble_reports for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- 確認: 修正後のポリシー一覧
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'trouble_reports'
order by cmd;
