-- ============================================================
-- NekoMap 目撃情報・スポット登録の「本人削除」を可能にするSQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- ============================================================
--
-- 背景:
--   目撃情報(sightings)・スポット登録(cat_spots)は、投稿した本人であっても
--   削除する手段がなかった（sightingsは管理者のみ削除可、cat_spotsには
--   そもそも削除ポリシーが存在しなかった）。
--   「投稿したら削除できない？」という指摘を受け、本人が自分の投稿を
--   削除できるようにする。既存の管理者削除ポリシーはそのまま残し、
--   RLSのOR結合を利用して追加する（既存ポリシーへの影響なし）。
--
-- ------------------------------------------------------------
-- sightings: 本人が削除可能に（既存の「管理者は削除可能」はそのまま維持）
-- ------------------------------------------------------------

drop policy if exists "本人は削除可能" on public.sightings;
create policy "本人は削除可能"
  on public.sightings for delete
  using (auth.uid() = created_by);

-- ------------------------------------------------------------
-- cat_spots: 本人・管理者が削除可能に（従来は削除ポリシーが存在せず、
-- 誰も削除できなかったため、本人用・管理者用を両方新設する）
-- ------------------------------------------------------------

drop policy if exists "本人は削除可能" on public.cat_spots;
create policy "本人は削除可能"
  on public.cat_spots for delete
  using (auth.uid() = created_by);

drop policy if exists "管理者は削除可能" on public.cat_spots;
create policy "管理者は削除可能"
  on public.cat_spots for delete
  using (public.is_admin());

-- ------------------------------------------------------------
-- 確認: 修正後のポリシー一覧
-- ------------------------------------------------------------
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('sightings', 'cat_spots')
order by tablename, cmd;
