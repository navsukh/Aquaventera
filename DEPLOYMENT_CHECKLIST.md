# Render deployment checklist

## Runtime readiness
- [x] The app uses `process.env.PORT` in [server.js](server.js) and falls back to `3000` locally.
- [x] `npm start` runs the Express server via [package.json](package.json).
- [x] The server starts in production mode and serves the health endpoint under `/api/health`.

## Production configuration
- [x] [server.js](server.js) requires `JWT_SECRET` at startup.
- [x] [server.js](server.js) requires `BASE_URL` when `NODE_ENV=production`.
- [x] CORS, CSP, and security headers are configured for production.
- [x] A Render-friendly config file was added at [render.yaml](render.yaml).

## PostgreSQL connection
- [x] [db/database.js](db/database.js) uses `DATABASE_URL` when present, with a PostgreSQL pool.
- [x] The code also supports fallback `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` values.
- [x] The app gracefully continues startup if PostgreSQL is temporarily unavailable, but full enquiry/admin functionality requires a live database.

## Supabase Storage connection
- [x] [services/supabase.js](services/supabase.js) uploads buffers to Supabase Storage using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [x] The bucket name is configurable with `SUPABASE_BUCKET`.
- [x] The public URL returned from Supabase is stored and used by the upload flow.

## Render setup steps
1. Create a PostgreSQL database service on Render and copy its connection string.
2. Create a Supabase project and note the project URL, service role key, and bucket name.
3. In Render, add the following environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `JWT_SECRET=<strong secret>`
   - `CSRF_SECRET=<strong secret>`
   - `BASE_URL=https://<your-render-url>`
   - `DATABASE_URL=<postgres connection string>`
   - `SUPABASE_URL=<supabase-project-url>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
   - `SUPABASE_BUCKET=uploads`
   - `ADMIN_EMAIL=<admin email>`
   - `ADMIN_PASSWORD=<admin password>`
4. Deploy the service; Render will run `npm install` and then `npm start`.
5. Verify the health endpoint: `https://<your-render-url>/api/health`.
6. Test the enquiry form and admin upload flow end to end.
