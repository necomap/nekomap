-- ============================================================
-- NekoMap サンプルデータ削除SQL（sample_data.sql と対）
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 安全のため、以下の条件を「両方満たす」行だけを削除します。
--   1. created_by が NULL（sample_data.sqlは投稿者IDを入れていない）
--   2. sample_data.sqlで実際に入れた文言と完全一致
-- 実データは基本的にログインユーザーのIDが created_by に入るため、
-- 誤って実データを消すリスクはほぼありません。
-- 削除前に対象件数を確認したい場合は、下の「事前確認」を先に実行してください。
-- ============================================================

-- ------------------------------------------------------------
-- 事前確認（削除せず、対象件数だけ見たい場合はこちらを先に実行）
-- ------------------------------------------------------------
-- select 'cats' as table_name, count(*) from cats
--   where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ')
-- union all
-- select 'stray_reports', count(*) from stray_reports
--   where created_by is null and features in ('灰色の短毛・中型','白黒ハチワレ・痩せ気味','茶白・子猫っぽい')
-- union all
-- select 'trouble_reports', count(*) from trouble_reports
--   where created_by is null and description in ('花壇に糞尿被害が続いています','夜中に猫の鳴き声・喧嘩音が聞こえます','足を引きずっている猫を見かけました')
-- union all
-- select 'cat_spots', count(*) from cat_spots
--   where created_by is null and description in ('砂場をトイレにしています','段ボールハウスを設置しています','朝夕に給餌しています')
-- union all
-- select 'posts', count(*) from posts
--   where created_by is null and title in ('迷子の猫を探しています','地域猫の見守り活動記録','保護しました','ボランティア募集のお知らせ')
-- union all
-- select 'volunteer_requests', count(*) from volunteer_requests
--   where created_by is null and title in ('TNR活動お手伝い','猫の餌やり見守り');

-- ------------------------------------------------------------
-- 削除本体（外部キー参照の関係で、子テーブルから先に消します）
-- ------------------------------------------------------------

-- サンプルの猫たちのID（後続の削除で使い回す）
with sample_cats as (
  select id from cats
  where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ')
)

-- 1. サンプルの猫に紐づく目撃情報
delete from sightings
where created_by is null
  and cat_id in (select id from sample_cats);

with sample_cats as (
  select id from cats
  where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ')
)
-- 2. サンプルの猫に紐づくTNR予定
delete from tnr_schedules
where created_by is null
  and cat_id in (select id from sample_cats);

with sample_cats as (
  select id from cats
  where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ')
)
-- 3. サンプルのナワバリ（猫に紐づくもの、または特定のポリゴンで挿入したもの）
delete from territories
where created_by is null
  and (
    cat_id in (select id from sample_cats)
    or polygon = '{"type":"Polygon","coordinates":[[[139.6960,35.6900],[139.7000,35.6900],[139.7000,35.6930],[139.6960,35.6930],[139.6960,35.6900]]]}'::jsonb
  );

-- 4. サンプルの猫本体
delete from cats
where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ');

-- 5. サンプルの野良猫出没情報
delete from stray_reports
where created_by is null
  and features in ('灰色の短毛・中型','白黒ハチワレ・痩せ気味','茶白・子猫っぽい');

-- 6. サンプルの困りごと報告
delete from trouble_reports
where created_by is null
  and description in ('花壇に糞尿被害が続いています','夜中に猫の鳴き声・喧嘩音が聞こえます','足を引きずっている猫を見かけました');

-- 7. サンプルのスポット（トイレ・ハウス・フード場所）
delete from cat_spots
where created_by is null
  and description in ('砂場をトイレにしています','段ボールハウスを設置しています','朝夕に給餌しています');

-- 8. サンプルの掲示板投稿
delete from posts
where created_by is null
  and title in ('迷子の猫を探しています','地域猫の見守り活動記録','保護しました','ボランティア募集のお知らせ');

-- 9. サンプルのボランティア募集
delete from volunteer_requests
where created_by is null
  and title in ('TNR活動お手伝い','猫の餌やり見守り');

-- ------------------------------------------------------------
-- 削除後の確認（0件になっていればサンプルデータは消えています）
-- ------------------------------------------------------------
select 'cats' as table_name, count(*) from cats
  where created_by is null and name in ('たま','クロ','ミケ','シロ','トラ')
union all
select 'sightings', count(*) from sightings where created_by is null
union all
select 'stray_reports', count(*) from stray_reports
  where created_by is null and features in ('灰色の短毛・中型','白黒ハチワレ・痩せ気味','茶白・子猫っぽい')
union all
select 'trouble_reports', count(*) from trouble_reports
  where created_by is null and description in ('花壇に糞尿被害が続いています','夜中に猫の鳴き声・喧嘩音が聞こえます','足を引きずっている猫を見かけました')
union all
select 'cat_spots', count(*) from cat_spots
  where created_by is null and description in ('砂場をトイレにしています','段ボールハウスを設置しています','朝夕に給餌しています')
union all
select 'territories', count(*) from territories where created_by is null
union all
select 'posts', count(*) from posts
  where created_by is null and title in ('迷子の猫を探しています','地域猫の見守り活動記録','保護しました','ボランティア募集のお知らせ')
union all
select 'volunteer_requests', count(*) from volunteer_requests
  where created_by is null and title in ('TNR活動お手伝い','猫の餌やり見守り')
union all
select 'tnr_schedules', count(*) from tnr_schedules where created_by is null;
