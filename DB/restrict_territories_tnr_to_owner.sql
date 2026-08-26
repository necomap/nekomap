-- ============================================================
-- NekoMap ナワバリ(territories)・TNR記録(tnr_schedules)の
-- 編集・削除を「自分の登録分のみ」に制限するSQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   これまでは「ログイン済みなら誰でも編集・削除可能」という、
--   複数ボランティアでの共同管理を想定した設計だったが、
--   他人の登録分を誤って（あるいは悪意で）編集・削除できて
--   しまうリスクの方を優先し、登録者本人と管理者のみに絞る方針に変更。
--
--   ※ もし後日「同じ団体のメンバー同士なら編集し合いたい」等の要望が
--     出てきた場合は、所属団体(organization)が一致するかで許可する
--     ポリシーに書き換えることもできます（今回はまず本人・管理者のみに限定）。
--
--   ⚠️ 重要な注意: これまで地図のナワバリ描画機能（MapView.js）は
--     territoriesにcreated_byを保存していなかった不具合があり
--     （今回のコード修正で保存されるように直しました）、それより前に
--     登録された既存のナワバリはcreated_byがNULLのままの可能性があります。
--     このSQL実行後、それらのナワバリは「本人」に該当する人がいないため
--     管理者しか編集・削除できなくなります。もし過去のナワバリも
--     元の登録者が編集できるようにしたい場合は、下の確認クエリで
--     created_byがNULLの行がないか確認し、必要なら管理者側で
--     手動でcreated_byを設定してください。
-- ============================================================

-- 事前確認: created_byが空（NULL）のナワバリがどれだけあるか
select count(*) as created_by_nullの件数 from public.territories where created_by is null;

-- ------------------------------------------------------------
-- territories
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが更新可能" on public.territories;
create policy "本人または管理者が更新可能"
  on public.territories for update
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "ログイン済みユーザーが削除可能" on public.territories;
create policy "本人または管理者が削除可能"
  on public.territories for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ------------------------------------------------------------
-- tnr_schedules
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが更新可能" on public.tnr_schedules;
create policy "本人または管理者が更新可能"
  on public.tnr_schedules for update
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "ログイン済みユーザーが削除可能" on public.tnr_schedules;
create policy "本人または管理者が削除可能"
  on public.tnr_schedules for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 確認: 修正後のポリシー一覧
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename in ('territories', 'tnr_schedules')
order by tablename, cmd;
