-- 野良猫出没情報（stray_reports）に、他の一覧ページと同じ地域フィルタ・
-- 本人/管理者による削除を追加する。
--
-- 背景: 目撃情報(sightings)・スポット(cat_spots)と同様に、野良猫出没情報にも
-- 一覧ページ（/stray）を新設する。sightings/cat_spotsのときと同じく、
-- 都道府県フィルタ用のprefecture列と、投稿者本人・管理者が削除できる
-- ポリシーを追加する（既存のSELECT/INSERTポリシーには手を加えない）。

-- 1. prefecture列の追加
alter table public.stray_reports add column if not exists prefecture text;
create index if not exists idx_stray_reports_prefecture on public.stray_reports(prefecture);

-- 2. 本人・管理者が削除可能に（従来は削除ポリシーが存在しなかった）
drop policy if exists "本人は削除可能" on public.stray_reports;
create policy "本人は削除可能"
  on public.stray_reports for delete
  using (auth.uid() = created_by);

drop policy if exists "管理者は削除可能" on public.stray_reports;
create policy "管理者は削除可能"
  on public.stray_reports for delete
  using (public.is_admin());

-- 確認: 修正後のポリシー一覧
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'stray_reports'
order by cmd;
