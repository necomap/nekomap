-- ============================================================
-- NekoMap ボランティア募集への位置情報（地図）追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 背景: ボランティア募集ページで、集合場所などを地図で確認できるように
--   したい。困りごとマップ（trouble_reports）と同じ方式（緯度経度を
--   保存し、一覧にGoogleマップへのリンクを表示）で対応する。
-- ============================================================

alter table public.volunteer_requests add column if not exists lat float;
alter table public.volunteer_requests add column if not exists lng float;

-- 確認
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'volunteer_requests' and column_name in ('lat', 'lng');
