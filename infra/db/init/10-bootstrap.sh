#!/bin/sh
# Local development only (T2.3): runs once when the postgres volume is first created.
# Creates PostGIS, kaamkaro_app and the API login from APP_DB_USER / APP_DB_PASSWORD (.env, fake values).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_login="$APP_DB_USER" -v app_password="$APP_DB_PASSWORD" \
  -f /kaamkaro-db/bootstrap.sql
