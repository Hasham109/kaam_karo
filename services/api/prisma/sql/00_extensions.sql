-- kk:section extensions (T2.3; D-001 PostgreSQL + PostGIS; BP §57, §81; ARCH §12)
-- PostGIS gives the geography columns used for addresses, location snapshots, service areas
-- and service zones. gen_random_uuid() is built into PostgreSQL 13+.
CREATE EXTENSION IF NOT EXISTS postgis;
