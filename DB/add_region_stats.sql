-- ============================================================
-- NekoMap 地域別活動統計ダッシュボード 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--（2026-09-28にSupabase MCP経由で本番へ適用済み。将来の環境再構築用に記録）
--
-- 背景:
--   都道府県別の活動状況（困りごと解決数・里親成立数・ボランティア募集数・
--   掲示板投稿数）を可視化する統計ダッシュボード（/stats）向けの集計関数。
--
-- 方針:
--   件数のみを返す関数で個人情報を含まないため、SECURITY DEFINERでRLSを
--   バイパスして全体集計を行い、anon/authenticated両方に公開する。
--   TNR実施数はcats/tnr_schedulesに地域情報(prefecture)がないため、
--   この関数の対象外（アプリ側で全国合計のみ別途取得して表示する）。
-- ============================================================

create or replace function public.get_region_stats()
returns table(
  prefecture text,
  reports_total bigint,
  reports_resolved bigint,
  adoptions_total bigint,
  adoptions_matched bigint,
  volunteer_total bigint,
  posts_total bigint
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    p as prefecture,
    coalesce(sum(reports_total), 0) as reports_total,
    coalesce(sum(reports_resolved), 0) as reports_resolved,
    coalesce(sum(adoptions_total), 0) as adoptions_total,
    coalesce(sum(adoptions_matched), 0) as adoptions_matched,
    coalesce(sum(volunteer_total), 0) as volunteer_total,
    coalesce(sum(posts_total), 0) as posts_total
  from (
    select
      coalesce(prefecture, '未設定') as p,
      count(*) as reports_total,
      count(*) filter (where status = '解決') as reports_resolved,
      0::bigint as adoptions_total, 0::bigint as adoptions_matched,
      0::bigint as volunteer_total, 0::bigint as posts_total
    from public.trouble_reports
    group by coalesce(prefecture, '未設定')
    union all
    select
      coalesce(prefecture, '未設定') as p,
      0, 0,
      count(*), count(*) filter (where status = '成立'),
      0, 0
    from public.adoptions
    group by coalesce(prefecture, '未設定')
    union all
    select
      coalesce(prefecture, '未設定') as p,
      0, 0, 0, 0,
      count(*), 0
    from public.volunteer_requests
    group by coalesce(prefecture, '未設定')
    union all
    select
      coalesce(prefecture, '未設定') as p,
      0, 0, 0, 0, 0,
      count(*)
    from public.posts
    where hidden = false
    group by coalesce(prefecture, '未設定')
  ) x
  group by p
  order by p;
$function$;

grant execute on function public.get_region_stats() to anon, authenticated;

-- 確認
select * from public.get_region_stats() limit 10;
