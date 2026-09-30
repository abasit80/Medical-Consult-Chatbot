# MediConsult

Medical information chatbot for **primary** and **urgent** consultation guidance, plus **report review**. Includes signup/login and a SQLite database initialized from a `.sql` schema file.

> **Disclaimer:** MediConsult is informational only. It is **not** a licensed clinician and **not** for emergencies. Call local emergency services for life-threatening symptoms.

## AI (ChatGPT)

Consultations and report reviews use **OpenAI ChatGPT** at runtime.

Set your key in `server/.env`:

```env
OPENAI_API_KEY=sk-your-real-key
OPENAI_MODEL=gpt-4o-mini
```

If the key is missing, the app falls back to the built-in rule engine.

## Features

- Signup / login with JWT auth
- Primary & urgent consultation chat with triage cues
- Medical report review (paste text or upload `.txt` / `.csv`)
- Health profile (allergies, conditions, blood group)
- Session history stored in SQLite
- Schema file: `database/mediconsult.sql`

## Deploy on Namecheap

See the full guide: [`NAMECHEAP_DEPLOY.md`](NAMECHEAP_DEPLOY.md)

Short version:

1. Build UI: `npm run build`
2. Create MySQL DB in cPanel and import `database/mediconsult.sql`
3. Upload project + set `server/.env` with Namecheap DB + OpenAI key
4. cPanel → **Setup Node.js App** → startup file `server/app.js`
5. Install deps on server: `npm --prefix server install --omit=dev`
6. Restart app and open your domain

You need a Namecheap plan with **Node.js** (or a VPS). PHP-only shared hosting cannot run this backend.

## Database (MySQL)

Configured in `server/.env`:

| Setting | Value |
|---------|--------|
| Host | `127.0.0.1` |
| Port | `3306` |
| User | `root` |
| Password | `2580` |
| Database | `mediconsult` |

- Schema: [`database/mediconsult.sql`](database/mediconsult.sql)
- On startup the API creates the database/tables if missing

Apply schema manually:

```bash
mysql -h 127.0.0.1 -P 3306 -u root -p2580 < database/mediconsult.sql
```

Tables: `users`, `chat_sessions`, `messages`, `medical_reports`, `triage_assessments`, `health_notes`.

## Project structure

```
Chatbot/
├── database/mediconsult.sql
├── server/          # Express + better-sqlite3 API
└── client/          # React (Vite) UI
```

## Sample report text

Use **Reports → Load sample labs** or paste values like:

```
Glucose: 118
HbA1c: 6.1
Total Cholesterol: 228
LDL: 148
Blood Pressure: 138/86
```
# Medical-Consult-Chatbot
