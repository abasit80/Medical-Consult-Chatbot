# Fix for mediconsult.thriverged.com showing "Index of /"

## Why you see `client/` and `server/`

LiteSpeed is treating your upload folder like a normal website folder.
There is **no Node.js app running**, so it lists directories instead of starting MediConsult.

You must create a **Setup Node.js App** in cPanel for this subdomain.

---

## Do this in Namecheap cPanel

### 1) Confirm frontend build exists on server
On the server, inside your project folder, you must have:

```text
client/dist/index.html
client/dist/assets/...
```

If missing, on your computer run:

```bash
npm run build
```

Then re-upload the `client/dist` folder.

### 2) Create Node.js application
1. cPanel → **Setup Node.js App**
2. **Create Application**
3. Fill:
   - **Node.js version:** 18 or 20
   - **Application mode:** Production
   - **Application root:** the folder that contains `app.js`, `client`, `server`  
     (same folder currently showing in the browser listing)
   - **Application URL:** `mediconsult.thriverged.com`
   - **Application startup file:** `app.js`
4. Click **Create**

### 3) Install packages on the server
In the Node.js app screen, open the terminal / SSH command it shows, then:

```bash
npm --prefix server install --omit=dev
```

### 4) Environment variables
Either upload `server/.env` (already prepared for production) **or** add these in the Node.js app “Environment variables” section:

- `NODE_ENV=production`
- `PORT=4000`
- `HOST=0.0.0.0`
- `JWT_SECRET=...`
- `TRUST_PROXY=1`
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_USER=Thriverged_db`
- `DB_PASSWORD=...`
- `DB_NAME=thrichdp_mediconsult`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-4o-mini`

### 5) MySQL tables
cPanel → **phpMyAdmin** → select `thrichdp_mediconsult` → **Import** → upload `database/mediconsult.sql`

### 6) Restart
In Setup Node.js App → **Restart**

### 7) Test
Open:

- `https://mediconsult.thriverged.com/api/health`
- `https://mediconsult.thriverged.com/`

You should see JSON health, then the MediConsult UI — **not** a folder list.

---

## Also upload these new root files

Upload to the same folder as `client` and `server`:

- `app.js`  ← required startup file
- `.htaccess` ← turns off directory listing

---

## If “Setup Node.js App” is missing

Your current plan may be PHP-only. Then this chatbot **cannot** run on that hosting.
You need Node.js enabled or a Namecheap VPS.
