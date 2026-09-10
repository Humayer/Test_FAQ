# DP HR FAQ Portal

An internal HR FAQ and contact-routing assistant for Datapath. Employees ask a
question in plain language, the portal matches it to the right HR topic, and
shows exactly who to contact — name, department, and email — sourced entirely
from your HR Contact spreadsheet. It never invents policy details it doesn't
have.

Fully self-hostable: no Vercel, no Firebase/Supabase, no proprietary hosted
database. Just Node.js, PostgreSQL, and a VPS.

---

## Features

- **Welcome page** with the Datapath logo, a personal "Start Conversation" CTA,
  and a floating chat popup (desktop bottom-right button, full-screen on mobile).
- **Conversational flow**: asks for the employee's name once, remembers it for
  the session, then routes every question to the right HR contact.
- **Hybrid FAQ matching engine**: exact phrase, keyword/synonym, and fuzzy
  (typo-tolerant) matching with a confidence score. High confidence answers
  immediately; medium confidence offers a choice of topics; low confidence
  asks the employee to rephrase and suggests categories.
- **Never hallucinates HR policy.** The portal only ever tells an employee
  *who* handles a topic — name, department, email — never invented policy
  details, deadlines, or amounts.
- **Excel import pipeline** with header auto-detection, malformed-email
  detection, contact/email count mismatch detection, duplicate detection, a
  full preview table, and admin confirmation before anything is written to
  the database. Nothing is ever silently "corrected."
- **Admin panel** (`/admin`) to manage HR topics, contacts, keywords/synonyms,
  and Excel imports, plus a dashboard with live database counts.
- Responsive, accessible, corporate UI built with Tailwind CSS.

---

## Technology stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Next.js Route Handlers (API routes)
- ExcelJS for spreadsheet parsing
- bcryptjs + JWT (jsonwebtoken) for admin authentication

---

## Requirements

- Node.js 20.9+ (Next.js 16 requirement)
- PostgreSQL 13+
- npm

---

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql://username:password@host:5432/database` |
| `NEXT_PUBLIC_APP_NAME` | Display name, defaults to "DP HR FAQ Portal" |
| `ADMIN_EMAIL` | The one admin account's email |
| `ADMIN_PASSWORD_HASH_BASE64` | Base64-encoded bcrypt hash of the admin password — **never store a plain-text password** |
| `AUTH_SECRET` | Random secret used to sign the admin session cookie |

Generate the admin password hash:

```bash
node scripts/hash-password.js "yourStrongPassword"
```

> The script prints a **base64-encoded** bcrypt hash on purpose. A raw bcrypt
> hash looks like `$2b$12$...` — and Next.js's `.env` loader (like many env
> file loaders) does shell-style `$VAR` expansion, which silently mangles a
> value containing literal `$` characters. Base64-encoding sidesteps that
> entirely. Paste the printed value as-is into `ADMIN_PASSWORD_HASH_BASE64`.

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Set up PostgreSQL

Create a database and point `DATABASE_URL` at it, e.g.:

```bash
createdb dp_hr_faq
```

## 4. Run Prisma migrations

```bash
npx prisma generate
npx prisma migrate dev
```

This creates all tables (`FAQTopic`, `ContactPerson`, `FAQTopicContact`,
`Conversation`, `Message`, `ImportBatch`).

## 5. Seed the initial HR contact data (optional but recommended)

The real spreadsheet you provided is bundled at
`prisma/seed-data/hr-contact-person.xlsx`. Seeding parses it with the same
validation the admin importer uses, and imports everything that passes:

```bash
npm run db:seed
```

Rows the validator can't confidently parse (e.g. a malformed email domain,
or a mismatched count of names vs. emails) are still imported but flagged
`needsReview` — visit **Admin → Contacts → "Needs review only"** afterwards
to fix them by hand. The importer never guesses; it always defers to a human
for anything ambiguous.

You can re-run imports any time later from **Admin → Import** with an updated
spreadsheet.

## 6. Development

```bash
npm run dev
```

Visit `http://localhost:3000` for the employee-facing portal and
`http://localhost:3000/admin` for the admin panel.

## 7. Production build & start

```bash
npm run build
npm start
```

---

## Excel import format

Required columns (header names are matched case-insensitively and the
importer scans the first 10 rows to find them, so a couple of title rows
above the header are fine):

- **Purpose**
- **Contact Person**
- **Department**
- **Contact Email**

Other columns (e.g. Cell Phone, Number of Work) are preserved but ignored for
routing.

`Contact Person` and `Contact Email` may contain comma-separated lists (e.g.
`Sam, Sami` / `sam@data-path.net, sami@data-path.net`). If the counts don't
match, the row is flagged **Needs Review** instead of guessing which name
maps to which email.

Emails that don't look like a valid address, or whose domain looks like a
typo of your company domain (e.g. `data-path.nret` instead of `data-path.net`),
are also flagged **Needs Review** rather than silently corrected.

---

## Admin usage

1. Sign in at `/admin/login` with `ADMIN_EMAIL` / the password you hashed
   into `ADMIN_PASSWORD_HASH_BASE64`.
2. **Dashboard** — live counts: topics, contacts, valid emails, pending
   reviews, and recent imports.
3. **HR Topics** — add/edit/delete topics, edit the Purpose/Department, edit
   the keyword/synonym list used by the matching engine, and assign contact
   persons.
4. **Contacts** — add/edit/delete contact persons, filter to "Needs review
   only", and clear a review flag once you've confirmed an email is correct.
5. **Import** — upload a new `.xlsx`, review the color-coded preview
   (✓ Valid / ⚠ Needs Review / ✕ Invalid), and click **Confirm import**.
   Nothing touches the database until you confirm.

### Updating HR contacts later

Just re-upload an updated spreadsheet from **Admin → Import**. Matching
existing topics (by Purpose) are updated in place rather than duplicated;
same for contacts matched by name + department.

---

## Testing

```bash
npm test
```

Covers: Excel header detection and parsing, email/contact validation
(malformed emails, mismatched person/email counts, duplicate purposes), the
FAQ matching engine (exact/keyword/synonym/fuzzy matching, confidence
scoring, multi-candidate ambiguity), and name-collection/greeting logic.

---

## VPS deployment guide

This is a normal self-hosted Next.js + PostgreSQL app. A typical setup:

### 1. Server prerequisites

```bash
# Node.js 20+, PostgreSQL, and PM2 (or another process manager)
sudo apt update
sudo apt install -y postgresql nginx
npm install -g pm2
```

### 2. Deploy the code

```bash
git clone <your-repo> /var/www/dp-hr-faq-portal
cd /var/www/dp-hr-faq-portal
npm install
cp .env.example .env   # then edit with production values
npx prisma generate
npx prisma migrate deploy
npm run db:seed        # optional, first time only
npm run build
```

### 3. Run with PM2

```bash
pm2 start npm --name "dp-hr-faq-portal" -- start
pm2 save
pm2 startup
```

### 4. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name hr.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hr.yourcompany.com
```

### 6. Keep it updated

```bash
cd /var/www/dp-hr-faq-portal
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart dp-hr-faq-portal
```

---

## Security notes

- `DATABASE_URL`, `ADMIN_PASSWORD_HASH_BASE64`, and `AUTH_SECRET` are server-only —
  never referenced from client components.
- Admin session is a signed, `httpOnly`, `secure` (in production) cookie.
  `/admin/*` pages and `/api/admin/*` routes are protected by `proxy.ts`
  (Next.js's request-interception layer — the successor to `middleware.ts`).
- Public FAQ endpoints (`/api/faq/*`) and the admin login endpoint are
  rate-limited per client IP.
- Excel uploads are restricted to `.xlsx`, capped at 5MB, and fully validated
  before any database write.
- Error responses to end users never include stack traces, database
  connection details, or internal file paths — see `lib/rateLimit.ts` and
  each route's `catch` block for the friendly messages actually shown.

---

## Troubleshooting

**"HR FAQ service is temporarily unavailable"** — usually means Postgres
isn't reachable. Check `DATABASE_URL` and that PostgreSQL is running.

**Admin login always fails** — make sure `ADMIN_PASSWORD_HASH_BASE64` is set
from `node scripts/hash-password.js` (base64-encoded, not a raw bcrypt hash —
raw hashes contain `$` characters that Next.js's `.env` loader will silently
mangle via shell-style variable expansion), and that `AUTH_SECRET` is set.

**"Unable to process the Excel file"** — the importer couldn't find a header
row containing Purpose / Contact Person / Department / Contact Email within
the first 10 rows. Check the column headers in your spreadsheet.

**Prisma engine download errors during `npm install` / `npx prisma generate`**
— Prisma downloads its query/schema-engine binaries from
`binaries.prisma.sh` the first time it runs. Make sure the server running
these commands has outbound internet access to that domain (this is
unrelated to `DATABASE_URL` and only affects the one-time engine download).

---

## Architecture / extensibility

```
app/
  page.tsx                 Welcome page
  admin/                   Admin panel (protected route group)
  api/
    faq/                   Public chat + topic endpoints
    admin/                 Protected admin endpoints (topics, contacts, import, auth)
components/
  chat/                    Chat UI (panel, popup launcher, message bubbles, contact card)
  admin/                   Admin UI (topics/contacts/import managers, nav)
  ui/                      Shared UI (logo, header, footer)
lib/
  db/                      Prisma client singleton
  faq/                     Conversation + matching orchestration
  search/                  Matching engine, normalization, default synonyms
  excel/                   Parsing, validation preview, apply-import
  validation/              Row-level validation rules
  auth/                    Admin auth (bcrypt + JWT cookie)
prisma/
  schema.prisma
  seed.ts
  seed-data/               Bundled initial spreadsheet
```

This was intentionally kept lean, per spec — but is straightforward to extend
with:

- Employee handbook / policy PDFs and full-text or RAG-based search
  (the `FAQTopic` model and matching engine are structured so a
  document-backed answer source could sit alongside contact routing).
- Employee authentication/profiles (swap the anonymous `sessionId` cookie for
  a real logged-in user).
- FAQ usage analytics (the `Message.matchedTopicId` / `confidence` columns
  already capture what was matched and how confidently, for later reporting).
- More departments/categories — just add rows via Admin → HR Topics, or
  re-import a bigger spreadsheet.
