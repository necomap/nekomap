-- ============================================================
-- NekoMap サンプルデータ投入SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- （SQL Editorでの実行はRLSポリシーの影響を受けないため、そのまま投入できます）
-- 対象: 地図表示に関わる主要テーブルに少量ずつ投入します
-- ============================================================

do $$
declare
  cat1 uuid := gen_random_uuid();
  cat2 uuid := gen_random_uuid();
  cat3 uuid := gen_random_uuid();
  cat4 uuid := gen_random_uuid();
  cat5 uuid := gen_random_uuid();
begin

-- 1. 地域猫 (cats)
insert into cats (id, name, features, sex, neutered, notes, created_at) values
(cat1, 'たま',   '茶トラ・耳先カット(さくらねこ)', 'メス', true,  '人懐っこい',                     now() - interval '40 days'),
(cat2, 'クロ',   '全身黒・白い靴下のような柄',      'オス', true,  'やや警戒心あり',                  now() - interval '30 days'),
(cat3, 'ミケ',   '三毛・小柄',                     'メス', false, '妊娠している可能性あり、要注意',   now() - interval '20 days'),
(cat4, 'シロ',   '白・片耳が垂れている',            '不明', false, null,                            now() - interval '10 days'),
(cat5, 'トラ',   'キジトラ・大柄',                 'オス', true,  '人慣れしていない',                now() - interval '5 days');

-- 2. 目撃情報 (sightings)
insert into sightings (cat_id, description, lat, lng, created_at) values
(cat1, '公園のベンチ下で日向ぼっこしていました',   35.6895, 139.6917, now() - interval '3 days'),
(cat2, '駐輪場付近をゆっくり歩いていました',       35.6912, 139.7005, now() - interval '2 days'),
(cat3, '公園の茂みで休んでいました',               35.6870, 139.6950, now() - interval '1 days'),
(cat4, '住宅街の路地で見かけました',               35.6930, 139.6980, now()),
(cat5, '神社の境内にいました',                     35.6850, 139.6890, now() - interval '6 hours');

-- 3. 野良猫出没情報 (stray_reports)
insert into stray_reports (features, comment, lat, lng, tnr_planned, created_at) values
('灰色の短毛・中型',       '公園付近をうろついていました',   35.6900, 139.6930, false, now() - interval '4 days'),
('白黒ハチワレ・痩せ気味', '餌をねだってきました',           35.6880, 139.6960, true,  now() - interval '2 days'),
('茶白・子猫っぽい',       '母猫と一緒にいるようでした',     35.6920, 139.6900, false, now());

-- 4. 困りごと報告 (trouble_reports)
insert into trouble_reports (type, description, lat, lng, address, status, created_at) values
('feces',  '花壇に糞尿被害が続いています',             35.6905, 139.6940, '○○公園南側',  '未対応', now() - interval '5 days'),
('fight',  '夜中に猫の鳴き声・喧嘩音が聞こえます',     35.6890, 139.6970, '○○町2丁目',   '対応中', now() - interval '3 days'),
('injury', '足を引きずっている猫を見かけました',       35.6875, 139.6920, '○○公園北側',  '未対応', now() - interval '1 days');

-- 5. トイレ・ハウス・フード場所 (cat_spots)
insert into cat_spots (type, description, lat, lng, verified, created_at) values
('toilet', '砂場をトイレにしています',       35.6898, 139.6935, true,  now() - interval '10 days'),
('house',  '段ボールハウスを設置しています', 35.6885, 139.6955, true,  now() - interval '7 days'),
('food',   '朝夕に給餌しています',           35.6910, 139.6910, false, now() - interval '3 days');

-- 6. ナワバリ (territories) ※猫と紐付け
insert into territories (polygon, color, cat_id, created_at) values
('{"type":"Polygon","coordinates":[[[139.6900,35.6880],[139.6950,35.6880],[139.6950,35.6910],[139.6900,35.6910],[139.6900,35.6880]]]}'::jsonb, '#e07a5f', cat1, now() - interval '15 days'),
('{"type":"Polygon","coordinates":[[[139.6960,35.6900],[139.7000,35.6900],[139.7000,35.6930],[139.6960,35.6930],[139.6960,35.6900]]]}'::jsonb, '#4a90e2', null, now() - interval '8 days');

-- 7. 掲示板投稿 (posts) ※hiddenは明示的にfalseを指定
insert into posts (title, body, category, hidden, report_count, created_at) values
('迷子の猫を探しています',           '○○公園付近で茶トラの猫を見失いました。情報お待ちしています。', 'lost',      false, 0, now() - interval '6 days'),
('地域猫の見守り活動記録',           '先週から見守りを始めました。みなさんもぜひご協力ください。',    'general',   false, 0, now() - interval '4 days'),
('保護しました',                     '怪我をした子猫を保護し、病院に連れて行きました。',              'rescue',    false, 0, now() - interval '2 days'),
('ボランティア募集のお知らせ',       '来月のTNR活動でお手伝いいただける方を募集しています。',        'volunteer', false, 0, now() - interval '1 days');

-- 8. ボランティア募集 (volunteer_requests)
insert into volunteer_requests (title, location, description, date, created_at) values
('TNR活動お手伝い',       '○○公園',   '捕獲器の設置と見守りをお願いします。',       (now() + interval '10 days')::date, now() - interval '2 days'),
('猫の餌やり見守り',       '○○町周辺', '週末の餌やり当番を探しています。',           (now() + interval '5 days')::date,  now() - interval '1 days');

-- 9. TNRカレンダー予定 (tnr_schedules) ※猫と紐付け
insert into tnr_schedules (cat_id, cat_name, capture_date, surgery_date, release_date, organization, note, created_at) values
(cat3, 'ミケ', (now() + interval '3 days')::date, (now() + interval '4 days')::date, (now() + interval '6 days')::date, 'NekoMap運営', '妊娠の可能性があるため優先対応', now() - interval '1 days'),
(cat5, 'トラ', (now() + interval '7 days')::date, null, null, 'NekoMap運営', '警戒心が強いため慎重に捕獲予定', now());

end $$;

-- 投入結果の確認
select 'cats' as table_name, count(*) from cats
union all select 'sightings', count(*) from sightings
union all select 'stray_reports', count(*) from stray_reports
union all select 'trouble_reports', count(*) from trouble_reports
union all select 'cat_spots', count(*) from cat_spots
union all select 'territories', count(*) from territories
union all select 'posts', count(*) from posts
union all select 'volunteer_requests', count(*) from volunteer_requests
union all select 'tnr_schedules', count(*) from tnr_schedules;
