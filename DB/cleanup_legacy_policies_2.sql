-- ============================================================
-- NekoMap 旧・重複RLSポリシーの整理SQL（その2）
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   cleanup_legacy_policies.sql実行前の確認結果を見返したところ、
--   cat_spotsに「誰でも閲覧可能」（条件:true）という、フード場所の
--   限定公開ポリシーとは別の、以前から存在していた緩いSELECTポリシーが
--   残っていたことが判明した。
--
--   これが残っていると「フード場所は登録者・管理者・認証済み団体のみ」
--   という制限がOR条件で無効化され、実質的に誰でもフード場所の
--   正確な位置を取得できてしまう（今回の②の修正が骨抜きになる）。
-- ============================================================

drop policy if exists "誰でも閲覧可能" on public.cat_spots;

-- 確認: cat_spotsのSELECTポリシーが「フード以外は誰でも閲覧可・フードは限定閲覧」
--   の1つだけになっていればOK
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'cat_spots'
order by cmd;
