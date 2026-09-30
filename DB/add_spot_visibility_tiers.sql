-- ============================================================
-- NekoMap スポット(cat_spots)の種類ごとの閲覧範囲を細分化するSQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- 前提: DB/fix_admin_rls_recursion.sql を先に実行し、public.is_admin() が
--       作成済みであること。
--
-- 背景:
--   これまでcat_spotsのSELECTポリシー「フード以外は誰でも閲覧可・
--   フードは限定閲覧」は、トイレ・猫ハウスは誰でも閲覧可、フードのみ
--   投稿者本人・認証済み団体・管理者に限定、という二分法だった。
--
--   今回、種類ごとに以下のように閲覧範囲を変更する。
--     ・トイレ(toilet)      : 活動者アカウント以上（活動者・団体・管理者）
--     ・フード(food)        : 団体アカウント(認証済み)以上のみ（当面、活動者は対象外）
--     ・猫ハウス(house)     : フードと同様、団体アカウント(認証済み)以上のみ
--   フード・猫ハウスを団体アカウント以上に限定しているのは、毒餌被害等
--   ハウス・フード置き場の悪用対策のため。状況を見ながら、将来的に
--   活動者アカウントにも開放する可能性がある（その場合は本ファイル末尾の
--   コメントを参照し、対象条件に activist を追加するだけでよい）。
--
--   注意: 上記に加えて、投稿者本人は自分の投稿を常に閲覧できるようにする
--   （これまでのフード限定ポリシーと同様の配慮）。また、未ログイン
--   ユーザー（anon）は種類を問わずcat_spotsを一切閲覧できなくなる
--   （従来はトイレ・猫ハウスは未ログインでも閲覧可能だったが、今回の
--   変更でトイレも「活動者アカウント以上」に限定されるため、この仕様
--   変更に伴う意図した挙動）。
-- ------------------------------------------------------------

drop policy if exists "フード以外は誰でも閲覧可・フードは限定閲覧" on public.cat_spots;
drop policy if exists "スポット種類別の閲覧範囲" on public.cat_spots;

create policy "スポット種類別の閲覧範囲"
  on public.cat_spots for select
  using (
    auth.uid() = created_by
    or public.is_admin()
    or (
      type = 'toilet'
      and exists (
        select 1 from public.users
        where id = auth.uid()
          and account_type in ('activist', 'organization')
      )
    )
    or (
      type in ('food', 'house')
      and exists (
        select 1 from public.users
        where id = auth.uid()
          and account_type = 'organization'
          and verified = true
      )
    )
  );

-- ------------------------------------------------------------
-- 参考: 将来フード・猫ハウスを活動者アカウントにも開放する場合は、
-- 上のポリシーのfood/house側の条件を以下のように変更すればよい
-- （account_type in ('activist','organization')に変更するだけで、
-- verified条件は団体アカウントのみに適用したい場合は分けて書く）。
--
--   or (
--     type in ('food', 'house')
--     and exists (
--       select 1 from public.users
--       where id = auth.uid()
--         and (
--           account_type = 'activist'
--           or (account_type = 'organization' and verified = true)
--         )
--     )
--   )
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 確認: 修正後のポリシー一覧
-- ------------------------------------------------------------
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'cat_spots'
order by cmd;
