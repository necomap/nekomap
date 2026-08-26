-- ============================================================
-- NekoMap フード場所（cat_spots）の秘匿をサーバー側でも強制するSQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景:
--   フード場所（毒餌被害防止のため非公開にしたい情報）が、これまで
--   画面（JavaScript）側で「一般ユーザーには表示しない」というだけの
--   制御になっていた。これはブラウザの開発者ツールなどでAPIに
--   直接アクセスすれば、一般ユーザーでも正確な位置を取得できてしまう
--   状態だった（見た目だけ隠していて、実際は誰でも見られる状態）。
--
--   このSQLは、データベース自体（RLS）で
--   「トイレ・ハウス（type≠food）は誰でも閲覧可」
--   「フード場所（type=food）は 登録者本人・管理者・認証済み団体 のみ閲覧可」
--   を強制するようにする。
-- ============================================================

-- 事前確認: 現在 cat_spots にどんなポリシーが設定されているか確認する。
-- もしここで「全員閲覧可能」のような緩いSELECTポリシーが別名で
-- 表示された場合、そのポリシー名を控えて
--   drop policy "そのポリシー名" on public.cat_spots;
-- を先に実行してから、下のCREATE POLICYを実行してください
-- （PostgreSQLのRLSは同じ操作に複数ポリシーがあるとOR条件で
--   合成されるため、緩いポリシーが残っていると今回の制限が効きません）。
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'cat_spots';

-- RLSを有効化（すでに有効な場合は何も変わらない）
alter table public.cat_spots enable row level security;

-- 閲覧: フード場所以外は誰でも見られる。フード場所は
--   本人 / 管理者 / 認証済み(verified)の団体アカウント のみ見られる。
drop policy if exists "フード以外は誰でも閲覧可・フードは限定閲覧" on public.cat_spots;
create policy "フード以外は誰でも閲覧可・フードは限定閲覧"
  on public.cat_spots for select
  using (
    type <> 'food'
    or created_by = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and (u.role = 'admin' or (u.account_type = 'organization' and u.verified = true))
    )
  );

-- 投稿: ログイン済みユーザーが自分の投稿として登録可能
drop policy if exists "ログイン済みユーザーが登録可能" on public.cat_spots;
create policy "ログイン済みユーザーが登録可能"
  on public.cat_spots for insert
  with check (auth.uid() = created_by);

-- 更新・削除: 登録者本人または管理者のみ
drop policy if exists "本人または管理者が更新可能" on public.cat_spots;
create policy "本人または管理者が更新可能"
  on public.cat_spots for update
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists "本人または管理者が削除可能" on public.cat_spots;
create policy "本人または管理者が削除可能"
  on public.cat_spots for delete
  using (
    auth.uid() = created_by
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 確認: 修正後のポリシー一覧
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'cat_spots'
order by cmd;
