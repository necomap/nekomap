-- ============================================================
-- NekoMap 管理画面が「確認中...」のまま開けない不具合の修正
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 【症状】
--   /admin を開くと「確認中...」の表示のまま止まり、管理画面が開けない。
--
-- 【原因】
--   これまで「管理者かどうか」を判定するRLSポリシーは、すべて
--     exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
--   という「usersテーブル自身を、もう一度SELECTして確認する」書き方を
--   していた（fix_rls_policies.sql / add_adoptions.sql など）。
--
--   これに加えて、usersテーブル自体のSELECTポリシーにも
--   「本人 または 管理者のみ閲覧可」という同じパターンの判定が
--   後から追加されたため（board/index.js等のコメントにある
--   「usersテーブル本体は本人・管理者のみ閲覧可」の対策）、
--
--     ① usersテーブルを読もうとする
--     ② SELECTポリシーが「管理者かどうか」を確認するために
--        再度usersテーブルをexistsでSELECTしようとする
--     ③ そのSELECTにも同じポリシーが適用され、また②を行う…
--
--   という無限ループ構造になってしまい、PostgreSQLが
--   "infinite recursion detected in policy for relation users"
--   というエラーを返すようになった。
--
--   管理画面(/admin)を開いたときに最初に行う「自分がadminかどうか」の
--   確認（=users.roleの取得）がまさにこの無限再帰に該当するため、
--   確認処理が完了せず「確認中...」のまま止まってしまっていた。
--
-- 【対策】
--   「管理者かどうか」の判定を、RLSを経由しない
--   SECURITY DEFINER関数 public.is_admin() に一本化する。
--   この関数の内部処理はRLSの対象外（テーブルを直接読める）ので、
--   ポリシーの中で使っても再帰が起きない。
--   以後、すべての「管理者のみ」系ポリシーはこの関数を使うように
--   統一し、usersテーブル自体のポリシーも作り直す。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 管理者判定用の安全な関数を作成
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 2. usersテーブル自体のポリシーを、無限再帰しない形に作り直す
--    （既存のポリシー名が環境によって異なっていても確実に消せるよう、
--    usersテーブルの全ポリシーを一度動的に削除してから作り直す）
-- ------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', pol.policyname);
  end loop;
end $$;

create policy "本人と管理者が閲覧可能"
  on public.users for select
  using (auth.uid() = id or public.is_admin());

create policy "本人が自分の行を作成可能"
  on public.users for insert
  with check (auth.uid() = id);

create policy "本人と管理者が更新可能"
  on public.users for update
  using (auth.uid() = id or public.is_admin());
-- ※ role / account_type / verified の自己昇格は、既存の
--   prevent_self_role_escalation トリガー（fix_rls_policies.sql）が
--   引き続き防止する。トリガーは残っていれば再作成不要。

-- ------------------------------------------------------------
-- 3. 他テーブルの「管理者のみ」ポリシーも is_admin() に統一
--    （再帰の心配がなくなり、判定も速くなる。動作の範囲は従来と同じ）
-- ------------------------------------------------------------

drop policy if exists "管理者は全ユーザーを更新可能" on public.users; -- 念のため旧名も削除

drop policy if exists "管理者は全投稿を削除可能" on public.posts;
create policy "管理者は全投稿を削除可能" on public.posts for delete using (public.is_admin());

drop policy if exists "管理者のみ閲覧可能" on public.contacts;
create policy "管理者のみ閲覧可能" on public.contacts for select using (public.is_admin());
drop policy if exists "管理者のみ対応更新可能" on public.contacts;
create policy "管理者のみ対応更新可能" on public.contacts for update using (public.is_admin());

drop policy if exists "管理者のみ閲覧可能" on public.blacklist;
create policy "管理者のみ閲覧可能" on public.blacklist for select using (public.is_admin());
drop policy if exists "管理者のみ追加可能" on public.blacklist;
create policy "管理者のみ追加可能" on public.blacklist for insert with check (public.is_admin());
drop policy if exists "管理者のみ削除可能" on public.blacklist;
create policy "管理者のみ削除可能" on public.blacklist for delete using (public.is_admin());

drop policy if exists "管理者のみ閲覧可能" on public.reports;
create policy "管理者のみ閲覧可能" on public.reports for select using (public.is_admin());
drop policy if exists "管理者のみ削除可能" on public.reports;
create policy "管理者のみ削除可能" on public.reports for delete using (public.is_admin());

drop policy if exists "本人と管理者が閲覧可能" on public.volunteer_applications;
create policy "本人と管理者が閲覧可能" on public.volunteer_applications for select
  using (auth.uid() = applicant or public.is_admin());

drop policy if exists "管理者は削除可能" on public.cats;
create policy "管理者は削除可能" on public.cats for delete using (public.is_admin());

drop policy if exists "管理者は削除可能" on public.sightings;
create policy "管理者は削除可能" on public.sightings for delete using (public.is_admin());

drop policy if exists "本人と管理者が更新可能" on public.adoptions;
create policy "本人と管理者が更新可能" on public.adoptions for update
  using (auth.uid() = created_by or public.is_admin());
drop policy if exists "本人と管理者が削除可能" on public.adoptions;
create policy "本人と管理者が削除可能" on public.adoptions for delete
  using (auth.uid() = created_by or public.is_admin());

-- ------------------------------------------------------------
-- 確認: usersテーブルのポリシー一覧（select/insert/updateが1つずつになっていればOK）
-- ------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'users'
order by cmd;
