-- 目撃情報（sightings）・スポット（cat_spots）に都道府県での絞り込みを追加する。
--
-- 背景:
-- - 困りごと(trouble_reports)・里親募集(adoptions)・ボランティア募集(volunteer_requests)・
--   掲示板(posts)には既に prefecture 列があり、一覧ページで地域フィルタ（RegionSelector）が
--   使えるようになっている。sightings と cat_spots にはまだ prefecture 列がないため、
--   同じ仕組みを追加する。
-- - sightings は SELECT ポリシーが「本人と管理者のみ直接閲覧可能」に制限されており、
--   一般ユーザー向けの一覧・地図表示は get_blurred_sightings() という既存のRPC
--   （座標を約100mぼかして返す）経由で行っている。このRPCの内部実装は不明なため、
--   プライバシー保護のロジックを壊すリスクを避け、既存のRPCには一切手を加えない。
--   代わりに、都道府県名（緯度経度そのものではなく、ぼかす必要のない粗い情報）だけを
--   返す、最小限の新しいRPC get_sightings_prefectures() を追加する。
--   一覧ページ側で get_blurred_sightings() の結果とこの新RPCの結果をidで結合して使う。
-- - cat_spots は非フード行が誰でも直接SELECT可能なポリシーになっているため、
--   prefecture列を追加するだけで既存の select("*") にそのまま乗ってくる（RPC不要）。

-- 1. prefecture列の追加（既存データはNULLのまま。今後の投稿から入力される）
alter table public.sightings add column if not exists prefecture text;
alter table public.cat_spots add column if not exists prefecture text;

create index if not exists idx_sightings_prefecture on public.sightings(prefecture);
create index if not exists idx_cat_spots_prefecture on public.cat_spots(prefecture);

-- 2. sightings用の最小限のprefecture取得専用RPC。
--    座標や本文などプライバシーに関わる情報は一切含めない。
--    get_blurred_sightings() は変更しない。
create or replace function public.get_sightings_prefectures()
returns table (id uuid, prefecture text)
language sql
security definer
set search_path = public
as $$
  select id, prefecture from public.sightings;
$$;

grant execute on function public.get_sightings_prefectures() to anon, authenticated;

-- 確認用（実行後、以下で列とRPCが反映されているか確認できます）
-- select column_name from information_schema.columns where table_name in ('sightings','cat_spots') and column_name = 'prefecture';
-- select proname from pg_proc where proname = 'get_sightings_prefectures';
