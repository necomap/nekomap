-- ============================================================
-- NekoMap 猫顔AI識別（個体識別）機能 追加SQL
-- 実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
--
-- 概要:
--   写真から猫の「特徴ベクトル（embedding）」をブラウザ側で計算し
--   （TensorFlow.js + MobileNet、無料・追加コストなし）、
--   登録済みの猫の中から見た目が似ている候補をAIが提示する機能。
--   ※ 猫の個体識別に特化して学習されたモデルではないため、
--     あくまで「候補の絞り込みを助ける参考情報」であり、
--     最終判断は必ず人の目で確認すること。
-- ============================================================

-- 1. pgvector拡張を有効化（ベクトルの類似検索を行うため）
create extension if not exists vector;

-- 2. catsテーブルに特徴ベクトル列を追加
--    次元数(1024)は MobileNet v1 (alpha=1.0) の埋め込み出力に合わせている。
--    lib/catFaceAI.js 側のモデル設定を変更する場合はここも合わせて変更すること。
alter table public.cats add column if not exists face_embedding vector(1024);
alter table public.cats add column if not exists face_embedding_updated_at timestamp;

-- 3. 類似検索用のインデックス（HNSW / コサイン類似度）
--    face_embedding が入っている行だけを対象にした部分インデックス
create index if not exists cats_face_embedding_idx
  on public.cats using hnsw (face_embedding vector_cosine_ops)
  where face_embedding is not null;

-- 4. 類似検索用の関数
--    写真から計算したベクトルを渡すと、似ている登録済みの猫を
--    類似度が高い順に返す。訃報登録済みの猫は候補から除外する。
--    SECURITY DEFINER にすることで、face_embedding列自体は
--    直接SELECTさせず、この関数経由でのみ結果（id/name/photo/類似度）
--    を返すようにしている。
create or replace function public.match_cat_by_embedding(
  query_embedding vector(1024),
  match_count int default 4,
  match_threshold float default 0.4
)
returns table (
  id uuid,
  name text,
  photo text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cats.id,
    cats.name,
    cats.photo,
    1 - (cats.face_embedding <=> query_embedding) as similarity
  from public.cats
  where cats.face_embedding is not null
    and coalesce(cats.memorial, false) = false
    and (cats.face_embedding <=> query_embedding) < match_threshold
  order by cats.face_embedding <=> query_embedding asc
  limit match_count;
$$;

-- 誰でも（未ログインでも目撃投稿できる場合に備え）検索関数を呼び出せるようにする
grant execute on function public.match_cat_by_embedding(vector(1024), int, float) to anon, authenticated;

-- ------------------------------------------------------------
-- 備考: face_embedding列の書き込み（登録・再計算）は
--   既存の cats テーブルのUPDATE/INSERTポリシー
--  （登録者本人 or 管理者）でそのまま許可されるため、
--   新しいポリシーの追加は不要。
-- ------------------------------------------------------------

-- 確認: 列が追加されたか
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'cats' and column_name like 'face_embedding%';

-- 確認: 関数が作成されたか
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'match_cat_by_embedding';
