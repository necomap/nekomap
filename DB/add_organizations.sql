-- ============================================================
-- NekoMap 団体チーム機能（複数人アカウントでの共同編集・招待制）
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- 前提: DB/fix_admin_rls_recursion.sql を先に実行し、public.is_admin() が
--       作成済みであること。
--
-- 【できるようになること】
--   団体の中にA・B・Cさんがいる場合、Aさんが「チームを作成」して
--   B・Cさんを招待すると、B・Cさんは自分自身のログインアカウントの
--   ままで、その団体の投稿（猫情報・掲示板・里親募集・ボランティア募集・
--   困りごと報告・ナワバリ・TNR予定）を編集できるようになる。
--   ※ 新規に「団体共有アカウント」を作るのではなく、各自が自分の
--     アカウントでログインしたまま、同じチームのメンバー同士で
--     互いの投稿を編集できるようにする仕組み。
--
-- 【設計】
--   1. organizations: チーム（団体）そのもの
--   2. users.organization_id: 自分がどのチームに所属しているか
--   3. organization_invites: 招待リンク（トークン付き）
--   4. is_org_member(target_id): 「自分とtarget_idが同じチームか」を
--      判定するRLSポリシー用の安全な関数（既存のis_admin()と同じ考え方）
--   5. 各コンテンツテーブルに「同じチームのメンバーは更新可能」という
--      ポリシーを“追加”する（既存ポリシーは削除しない。RLSは複数の
--      ポリシーがOR条件で合成されるため、既存の「本人のみ編集可」に
--      「チームメンバーも編集可」を安全に上乗せできる）。
--
-- 【注意】テーブル作成 → 列追加 → その列を使うRLSポリシー、という順番で
--   実行される必要があるため、本ファイルは上から順に実行してください
--   （前バージョンでは、users.organization_id列を追加する前にその列を
--   参照するポリシーを作ろうとして「column organization_id does not
--   exist」エラーになる順序ミスがあったため、2026-09-29に順序を修正）。
-- ============================================================

-- ------------------------------------------------------------
-- 1. organizations（チーム）テーブル本体を先に作成（ポリシーはまだ付けない）
-- ------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. users.organization_id（どのチームに所属しているか）
--    ※ organizationsテーブルへの参照ポリシーより先に、この列を作る
-- ------------------------------------------------------------
alter table public.users
  add column if not exists organization_id uuid references public.organizations(id);

-- ------------------------------------------------------------
-- 3. organizationsテーブルのRLSを有効化し、ポリシーを設定
--    （ここでようやくusers.organization_idを参照できる）
-- ------------------------------------------------------------
alter table public.organizations enable row level security;

drop policy if exists "メンバーと管理者が閲覧可能" on public.organizations;
create policy "メンバーと管理者が閲覧可能"
  on public.organizations for select
  using (
    id in (select organization_id from public.users where id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "本人がチームを作成可能" on public.organizations;
create policy "本人がチームを作成可能"
  on public.organizations for insert
  with check (auth.uid() = created_by);

drop policy if exists "作成者と管理者が更新可能" on public.organizations;
create policy "作成者と管理者が更新可能"
  on public.organizations for update
  using (auth.uid() = created_by or public.is_admin());

-- 「自分」と「target_id」が同じチームに所属しているかを判定する関数
-- （usersテーブルへの参照はRLSを経由しないので、is_admin()と同様に
--   ポリシーの中で使っても無限再帰しない）
create or replace function public.is_org_member(target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users a
    join public.users b on a.organization_id = b.organization_id
    where a.id = auth.uid()
      and b.id = target_id
      and a.organization_id is not null
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;

-- 同じチームのメンバー同士は、お互いの基本プロフィールを閲覧できるようにする
-- （既存の「本人と管理者が閲覧可能」ポリシーに追加。既存ポリシーは変更しない）
drop policy if exists "同じチームのメンバーが閲覧可能" on public.users;
create policy "同じチームのメンバーが閲覧可能"
  on public.users for select
  using (public.is_org_member(id));

-- ------------------------------------------------------------
-- 4. organization_invites（招待）
-- ------------------------------------------------------------
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text,
  token text not null unique default md5(random()::text || clock_timestamp()::text),
  invited_by uuid references public.users(id),
  status text not null default 'pending', -- pending / accepted / revoked
  accepted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

alter table public.organization_invites enable row level security;

drop policy if exists "チームメンバーが閲覧可能" on public.organization_invites;
create policy "チームメンバーが閲覧可能"
  on public.organization_invites for select
  using (
    organization_id in (select organization_id from public.users where id = auth.uid())
    or invited_by = auth.uid()
    or public.is_admin()
  );

drop policy if exists "チームメンバーが招待可能" on public.organization_invites;
create policy "チームメンバーが招待可能"
  on public.organization_invites for insert
  with check (
    organization_id in (select organization_id from public.users where id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "招待者と管理者が取り消し可能" on public.organization_invites;
create policy "招待者と管理者が取り消し可能"
  on public.organization_invites for update
  using (
    organization_id in (select organization_id from public.users where id = auth.uid())
    or public.is_admin()
  );

-- 招待リンクを受け取った側が、トークンだけで安全に参加できるようにする関数
-- （SECURITY DEFINERでRLSを経由しないため、招待された側がまだチームの
--   メンバーでなくても実行できる。中でトークンの有効性を厳密にチェックする）
create or replace function public.accept_org_invite(invite_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select * into inv from public.organization_invites
    where token = invite_token and status = 'pending' and expires_at > now();

  if inv is null then
    raise exception '招待リンクが無効か、有効期限が切れています';
  end if;

  update public.users set organization_id = inv.organization_id where id = auth.uid();
  update public.organization_invites
    set status = 'accepted', accepted_by = auth.uid()
    where id = inv.id;

  return (select json_build_object('organization_id', o.id, 'organization_name', o.name)
          from public.organizations o where o.id = inv.organization_id);
end;
$$;

grant execute on function public.accept_org_invite(text) to authenticated;

-- ------------------------------------------------------------
-- 5. 各コンテンツテーブルに「同じチームのメンバーは更新可能」を追加
--    （既存の「本人のみ更新可」ポリシーはそのまま。OR条件で上乗せされる）
-- ------------------------------------------------------------

drop policy if exists "同じチームのメンバーが更新可能" on public.cats;
create policy "同じチームのメンバーが更新可能"
  on public.cats for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.posts;
create policy "同じチームのメンバーが更新可能"
  on public.posts for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.adoptions;
create policy "同じチームのメンバーが更新可能"
  on public.adoptions for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.volunteer_requests;
create policy "同じチームのメンバーが更新可能"
  on public.volunteer_requests for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.trouble_reports;
create policy "同じチームのメンバーが更新可能"
  on public.trouble_reports for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.territories;
create policy "同じチームのメンバーが更新可能"
  on public.territories for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.tnr_schedules;
create policy "同じチームのメンバーが更新可能"
  on public.tnr_schedules for update
  using (public.is_org_member(created_by));

drop policy if exists "同じチームのメンバーが更新可能" on public.sightings;
create policy "同じチームのメンバーが更新可能"
  on public.sightings for update
  using (public.is_org_member(created_by));

-- ------------------------------------------------------------
-- 確認
-- ------------------------------------------------------------
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and (tablename in ('organizations', 'organization_invites')
       or policyname = '同じチームのメンバーが更新可能'
       or policyname = '同じチームのメンバーが閲覧可能')
order by tablename;
