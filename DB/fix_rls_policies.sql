-- ============================================================
-- NekoMap RLSポリシー修正SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- ============================================================

-- ------------------------------------------------------------
-- A. 【最重要】自己昇格の防止 + 管理者は全ユーザーを操作可能に
-- 現状: usersテーブルは「auth.uid() = id」だけで更新可能なため、
--       一般ユーザーが自分のrole/account_type/verifiedを勝手に
--       書き換えて管理者になりすませてしまう。
-- 対策: トリガーで「管理者本人以外がrole等を変更しても、
--       元の値に戻す」ようにする。SQL Editor（サービスロール）
--       から実行する場合は auth.uid() が null になるため、
--       従来通りの手動昇格SQLはそのまま使える。
-- ------------------------------------------------------------

create or replace function public.prevent_self_role_escalation()
returns trigger as $$
begin
  -- SQL Editor / サーバー側からの実行（auth.uid()が取れない）は許可
  if auth.uid() is null then
    return new;
  end if;

  -- 実行者が既に管理者なら、他ユーザーのBAN・昇格などを許可
  if exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    return new;
  end if;

  -- それ以外（一般ユーザーが自分の行を更新する場合）は
  -- role / account_type / verified を書き換えさせない
  new.role := old.role;
  new.account_type := old.account_type;
  new.verified := old.verified;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_self_role_escalation on public.users;
create trigger trg_prevent_self_role_escalation
  before update on public.users
  for each row execute function public.prevent_self_role_escalation();

-- 管理者は全ユーザーの行を更新できるようにする（BAN・権限変更に必要）
drop policy if exists "管理者は全ユーザーを更新可能" on public.users;
create policy "管理者は全ユーザーを更新可能"
  on public.users for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- B. posts: 通報カウント更新・管理者による削除ができるように
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが通報カウントを更新可能" on public.posts;
create policy "ログイン済みユーザーが通報カウントを更新可能"
  on public.posts for update
  using (auth.uid() is not null);

drop policy if exists "管理者は全投稿を削除可能" on public.posts;
create policy "管理者は全投稿を削除可能"
  on public.posts for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- C. contacts: フォーム送信を許可、閲覧・対応は管理者のみ
-- ------------------------------------------------------------

drop policy if exists "誰でもお問い合わせ可能" on public.contacts;
create policy "誰でもお問い合わせ可能"
  on public.contacts for insert
  with check (true);

drop policy if exists "管理者のみ閲覧可能" on public.contacts;
create policy "管理者のみ閲覧可能"
  on public.contacts for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "管理者のみ対応更新可能" on public.contacts;
create policy "管理者のみ対応更新可能"
  on public.contacts for update
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- D. blacklist: 管理者のみ閲覧・追加・削除
-- ------------------------------------------------------------

drop policy if exists "管理者のみ閲覧可能" on public.blacklist;
create policy "管理者のみ閲覧可能"
  on public.blacklist for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "管理者のみ追加可能" on public.blacklist;
create policy "管理者のみ追加可能"
  on public.blacklist for insert
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "管理者のみ削除可能" on public.blacklist;
create policy "管理者のみ削除可能"
  on public.blacklist for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- E. reports（投稿の通報）: ログイン済みユーザーが通報でき、
--    閲覧・削除は管理者のみ
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが通報可能" on public.reports;
create policy "ログイン済みユーザーが通報可能"
  on public.reports for insert
  with check (auth.uid() = created_by);

drop policy if exists "管理者のみ閲覧可能" on public.reports;
create policy "管理者のみ閲覧可能"
  on public.reports for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

drop policy if exists "管理者のみ削除可能" on public.reports;
create policy "管理者のみ削除可能"
  on public.reports for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- F. chats: ログイン済みユーザーが閲覧・投稿可能
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが閲覧可能" on public.chats;
create policy "ログイン済みユーザーが閲覧可能"
  on public.chats for select
  using (auth.uid() is not null);

drop policy if exists "ログイン済みユーザーが投稿可能" on public.chats;
create policy "ログイン済みユーザーが投稿可能"
  on public.chats for insert
  with check (auth.uid() = sender);

-- ------------------------------------------------------------
-- G. volunteer_requests: 誰でも閲覧可能、ログイン済みユーザーが投稿可能
-- ------------------------------------------------------------

drop policy if exists "誰でも閲覧可能" on public.volunteer_requests;
create policy "誰でも閲覧可能"
  on public.volunteer_requests for select
  using (true);

drop policy if exists "ログイン済みユーザーが投稿可能" on public.volunteer_requests;
create policy "ログイン済みユーザーが投稿可能"
  on public.volunteer_requests for insert
  with check (auth.uid() = created_by);

-- ------------------------------------------------------------
-- H. volunteer_applications: 応募者本人と管理者のみ閲覧、
--    ログイン済みユーザーが応募可能
-- ------------------------------------------------------------

drop policy if exists "本人と管理者が閲覧可能" on public.volunteer_applications;
create policy "本人と管理者が閲覧可能"
  on public.volunteer_applications for select
  using (
    auth.uid() = applicant
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "ログイン済みユーザーが応募可能" on public.volunteer_applications;
create policy "ログイン済みユーザーが応募可能"
  on public.volunteer_applications for insert
  with check (auth.uid() = applicant);

-- ------------------------------------------------------------
-- I. cats: 管理者が削除可能に
-- ------------------------------------------------------------

drop policy if exists "管理者は削除可能" on public.cats;
create policy "管理者は削除可能"
  on public.cats for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- J. sightings: 管理者が削除可能に
-- ------------------------------------------------------------

drop policy if exists "管理者は削除可能" on public.sightings;
create policy "管理者は削除可能"
  on public.sightings for delete
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- ------------------------------------------------------------
-- K. territories: ログイン済みユーザーが更新・削除可能
--    （ナワバリ管理画面はログインユーザーなら誰でも編集できる仕様のため）
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが更新可能" on public.territories;
create policy "ログイン済みユーザーが更新可能"
  on public.territories for update
  using (auth.uid() is not null);

drop policy if exists "ログイン済みユーザーが削除可能" on public.territories;
create policy "ログイン済みユーザーが削除可能"
  on public.territories for delete
  using (auth.uid() is not null);

-- ------------------------------------------------------------
-- L. tnr_schedules: ログイン済みユーザーが完了フラグを更新可能
-- ------------------------------------------------------------

drop policy if exists "ログイン済みユーザーが更新可能" on public.tnr_schedules;
create policy "ログイン済みユーザーが更新可能"
  on public.tnr_schedules for update
  using (auth.uid() is not null);

-- ------------------------------------------------------------
-- 確認: 修正後のポリシー一覧
-- ------------------------------------------------------------
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
