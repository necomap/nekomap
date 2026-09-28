-- ============================================================
-- NekoMap 地域（都道府県）フィルタ機能 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--（2026-09-28にSupabase MCP経由で本番へ適用済み。将来の環境再構築用に記録）
--
-- 背景:
--   全国の投稿が一括表示されると見づらいため、都道府県単位で
--   表示を絞り込めるようにする（ジモティのような地域絞り込みUI）。
--
-- 方針:
--   困りごと報告(trouble_reports)・里親募集(adoptions)・
--   ボランティア募集(volunteer_requests)・掲示板投稿(posts)に
--   任意の prefecture 列を追加。位置情報から自動判定（逆geocode）した上で
--   ユーザーが手動修正できる（掲示板は位置情報が無いため手動選択のみ）。
--   prefecture が未設定の投稿は、どの地域フィルタが有効でも常に表示対象
--   のまま（フィルタで除外しない）。
--
--   ユーザー(users)に default_prefecture を追加し、プロフィール編集画面で
--   保存できるようにする。ログイン時はこれを一覧のデフォルト絞り込みに使う。
--   ログインしていない場合は現在地から自動判定（DBには保存せずセッション内のみ）。
--
--   地図のピン（MapView）自体はこのフィルタの対象外で、常に全国表示のまま。
--   地図の初期表示位置（中心地）のみ、現在地取得に失敗した場合の
--   フォールバック先としてログイン中の default_prefecture を利用する。
-- ============================================================

alter table public.trouble_reports add column if not exists prefecture text;
alter table public.adoptions add column if not exists prefecture text;
alter table public.volunteer_requests add column if not exists prefecture text;
alter table public.posts add column if not exists prefecture text;
alter table public.users add column if not exists default_prefecture text;

create index if not exists trouble_reports_prefecture_idx on public.trouble_reports (prefecture);
create index if not exists adoptions_prefecture_idx on public.adoptions (prefecture);
create index if not exists volunteer_requests_prefecture_idx on public.volunteer_requests (prefecture);
create index if not exists posts_prefecture_idx on public.posts (prefecture);

-- 既存のRLSポリシー（各テーブルのINSERT/UPDATEはauth.uid() = created_by、
-- usersはauth.uid() = idで自分の行のみ更新可）が行全体を対象にしているため、
-- 列を追加するだけの本変更ではRLSポリシーの変更は不要。

-- 確認
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name in ('prefecture', 'default_prefecture')
order by table_name;
