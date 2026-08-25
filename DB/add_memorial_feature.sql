-- ============================================================
-- NekoMap 訃報（メモリアル）機能 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- ============================================================

-- 1. catsテーブルに訃報関連の列を追加
alter table public.cats add column if not exists memorial boolean default false;
alter table public.cats add column if not exists memorial_note text;
alter table public.cats add column if not exists memorial_date date;

-- 2. 管理者が猫情報を更新できるように（現状は登録者本人のみ更新可）
drop policy if exists "管理者は猫情報を更新可能" on public.cats;
create policy "管理者は猫情報を更新可能"
  on public.cats for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- 3. 猫の登録者が「自分の猫」への通報(reports)を見られるように
--    （訃報の可能性を他ユーザーが報告した際、登録者本人に伝わるようにするため）
drop policy if exists "対象の猫の登録者も閲覧可能" on public.reports;
create policy "対象の猫の登録者も閲覧可能"
  on public.reports for select
  using (
    target_table = 'cats' and exists (
      select 1 from public.cats c where c.id = reports.target_id and c.created_by = auth.uid()
    )
  );

-- 確認
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'cats' and column_name like 'memorial%';
