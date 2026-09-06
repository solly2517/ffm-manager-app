# Deploying FFM Manager independently of Manus

This app now runs entirely on standard infrastructure: Node.js + Express,
MySQL, and any S3-compatible object store. Nothing left in the code talks to
Manus's servers.

## 1. Set up Railway

1. Create an account at https://railway.app
2. New Project → Deploy from GitHub repo → pick this repo
3. Railway will detect the `Dockerfile` and build automatically
4. In the same project, click **+ New → Database → MySQL**. Railway
   provisions it and gives you a `DATABASE_URL` — copy it.

## 2. Set up storage (Cloudflare R2 — recommended, no egress fees)

1. https://dash.cloudflare.com → R2 → Create bucket (any name, e.g. `ffm-manager`)
2. R2 → Manage API tokens → Create API token → permission "Object Read & Write", scoped to that bucket
3. Note down: Account ID, Access Key ID, Secret Access Key
4. Your `S3_ENDPOINT` is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

(AWS S3 or DigitalOcean Spaces work the same way — just fill in their
endpoint/region instead.)

## 3. Configure environment variables

In Railway → your service → Variables, set everything from `.env.example`:

```
DATABASE_URL=<from Railway MySQL plugin>
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
S3_ENDPOINT=<from step 2>
S3_REGION=auto
S3_BUCKET=<your bucket name>
S3_ACCESS_KEY_ID=<from step 2>
S3_SECRET_ACCESS_KEY=<from step 2>
NODE_ENV=production
```

## 4. Run the database migration

Once `DATABASE_URL` is set, run this once (from your machine, with
`DATABASE_URL` set in your shell to the same value, or via Railway's shell):

```
npm install
npx drizzle-kit migrate
```

This creates all 34 tables (this app's full schema) plus the new
`passwordHash` column.

## 5. Migrate existing files (logo, Arabic font, help videos)

The app references a few static assets by a fixed storage key (company
logo, Arabic PDF font, help-page walkthrough videos). Run this once, while
your old Manus deployment is still reachable:

```
OLD_APP_URL=https://ffmmanager-9wxfbeae.manus.space \
S3_ENDPOINT=... S3_REGION=auto S3_BUCKET=... \
S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
node scripts/migrate-storage-from-manus.mjs
```

**Important:** this only covers the fixed assets baked into the code. Any
photos/signatures/delivery-proof evidence your team has already captured
through the live app lives in Manus's storage too — those rows in the
database have their own storage keys. If you want that history to carry
over, export the list of `storageKey` values from your old database's
`evidence`, `surgeryDeliveryProofs`, and `warehouse_delivery_proofs` tables
into a text file (one key per line) and pass it as an extra argument to the
same script. If that history doesn't matter to you, skip this — the app
works fine going forward either way.

## 6. Deploy and create your first account

1. Push/deploy — Railway will build and give you a `*.up.railway.app` URL
   (or attach your own domain under Settings → Networking)
2. Visit `https://your-domain/setup` once — this creates the first admin
   account. This route stops working the moment any user exists, so it's
   safe to leave in the codebase permanently.
3. From the admin panel, invite everyone else — they'll get a link to
   `/invite/:token` where they set their own name and password.

## 7. Optional: Google Drive backups

If you use the built-in Google Drive backup feature, create OAuth
credentials at https://console.cloud.google.com/apis/credentials with
authorized redirect URI `https://your-domain/api/oauth/google-drive/callback`,
then set `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and
`GOOGLE_DRIVE_CALLBACK_URL` (same URL as above) in Railway.

## 8. Optional: weekly backup reminder cron

The app has a `/api/scheduled/weekly-backup-reminder` endpoint that used to
be triggered by Manus's built-in scheduler. To keep it working, set
`CRON_SECRET` in Railway, then point any external cron service (Railway's
own cron, GitHub Actions on a schedule, cron-job.org, etc.) at:

```
POST https://your-domain/api/scheduled/weekly-backup-reminder
Header: X-Cron-Secret: <your CRON_SECRET value>
```

Leave `CRON_SECRET` unset if you don't need this — the endpoint just stays
unreachable.
