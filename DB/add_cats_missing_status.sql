-- 地域猫台帳（cats）に「行方不明」ステータスを追加する。
--
-- 既存の「訃報（memorial）」機能と同じ考え方・同じ権限構造を再利用する。
-- cats.missingは、既存の「本人のみ更新可」「同じチームのメンバーは更新可能」
-- （＋管理者。訃報機能が既にisOwnerOrAdminで動作していることから、
-- 既存のUPDATE権限に管理者も含まれていることを前提にしている）で
-- そのまま更新できるため、新しいRLSポリシーは不要（既存のUPDATE権限を再利用）。

alter table public.cats add column if not exists missing boolean not null default false;
alter table public.cats add column if not exists missing_note text;
alter table public.cats add column if not exists missing_date date;

create index if not exists idx_cats_missing on public.cats(missing);

-- 確認用
-- select column_name from information_schema.columns where table_name = 'cats' and column_name like 'missing%';
