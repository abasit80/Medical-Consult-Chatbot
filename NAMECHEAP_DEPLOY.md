# Deploy MediConsult on Namecheap

This app needs **Node.js + MySQL**. Plain PHP-only shared hosting is not enough for the API.

## Which Namecheap plan?

| Plan | Works? | Notes |
|------|--------|--------|
| Shared hosting with **Setup Node.js App** (cPanel) | Yes | Best match for this project |
| **VPS** (Namecheap VPS / EasyPanel) | Yes | Full control |
| Shared hosting **without** Node.js | No | Frontend-only would break chat/login |

In cPanel, look for **Setup Node.js App**. If it is missing, upgrade to a plan/VPS with Node.js.

---

## 1) Prepare locally (build the frontend)

On your computer:

```bash
cd "/Volumes/Personal/Personal data/Chatbot"
npm run install:all
npm run build
```

This creates `client/dist/` — the Express server serves it in production.

---

## 2) Create MySQL database on Namecheap

1. cPanel → **MySQL Databases**
2. Create database, e.g. `youruser_mediconsult`
3. Create a MySQL user and assign it **ALL PRIVILEGES** on that database
4. Note exact names (Namecheap prefixes them with your cPanel username)

Import schema:

- cPanel → **phpMyAdmin** → select your DB → **Import**
- Upload `database/mediconsult.sql`

Or from SSH (if enabled):

```bash
mysql -u youruser_mediconsult -p youruser_mediconsult < database/mediconsult.sql
```

---

## 3) Upload project files

Upload the whole project (File Manager or FTP/SFTP), for example to:

```text
/home/YOURUSER/mediconsult/
```

Include:

- `server/`
- `client/dist/` (built files)
- `database/`
- root `package.json`

Do **not** upload:

- `node_modules/` (install on server)
- local `server/.env` with your home passwords (create a new one on server)
- `server/data/` SQLite leftovers if any

---

## 4) Create production environment file

On the server, create `server/.env`:

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
JWT_SECRET=put-a-long-random-secret-here
TRUST_PROXY=1

DB_HOST=localhost
DB_PORT=3306
DB_USER=youruser_mediconsult
DB_PASSWORD=your-mysql-password
DB_NAME=youruser_mediconsult

OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

Copy from `server/.env.example` and fill real values.

---

## 5A) Deploy with cPanel “Setup Node.js App”

1. cPanel → **Setup Node.js App** → **Create Application**
2. Recommended settings:
   - **Node.js version:** 18+ or 20+
   - **Application mode:** Production
   - **Application root:** `mediconsult` (folder you uploaded)
   - **Application URL:** your domain or subdomain (e.g. `chat.yourdomain.com`)
   - **Application startup file:** `server/app.js`
3. Click **Create**
4. Open the virtual environment terminal shown by cPanel (or SSH) and run:

```bash
cd ~/mediconsult
npm --prefix server install --omit=dev
```

If `client/dist` is missing on the server, build on your PC and re-upload `client/dist`.

5. In the Node.js app panel, add the same env vars as in `.env` (or rely on `server/.env`)
6. **Restart** the application
7. Visit your domain and open `/api/health` — you should see `"status":"ok"`

### Point domain / subdomain

- cPanel → **Domains / Subdomains** → point to the Node app URL, or use the Application URL from Setup Node.js App.

---

## 5B) Deploy on Namecheap VPS (SSH)

```bash
# install node 20 if needed, then:
cd /var/www/mediconsult
npm --prefix server install --omit=dev
npm --prefix client install
npm run build
# configure server/.env
npm --prefix server start
```

Use **PM2** to keep it online:

```bash
npm install -g pm2
pm2 start server/index.js --name mediconsult
pm2 save
pm2 startup
```

Put Nginx in front:

```nginx
server {
  listen 80;
  server_name chat.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then enable HTTPS with Let’s Encrypt / cPanel SSL / Certbot.

---

## 6) After deploy checklist

- [ ] `https://yourdomain.com/api/health` works
- [ ] Signup / login works (MySQL connected)
- [ ] Chat returns real answers (OpenAI key set)
- [ ] Report upload works (`server/uploads` writable)
- [ ] Change `JWT_SECRET` from the default
- [ ] Prefer HTTPS only

Make uploads folder writable:

```bash
mkdir -p server/uploads
chmod 755 server/uploads
```

---

## Common Namecheap issues

**“Application failed to start”**  
- Startup file must be `server/app.js`
- Dependencies installed inside the Node app virtualenv
- Check stderr logs in Setup Node.js App

**DB connection refused / Access denied**  
- Use `localhost` (not `127.0.0.1` sometimes fails on shared)
- Use exact cPanel DB name/user (`youruser_dbname`)
- Import `database/mediconsult.sql`

**Blank page / 503 Frontend not built**  
- Upload `client/dist` after `npm run build`

**Chat fails**  
- `OPENAI_API_KEY` missing/invalid on server env

**CORS errors**  
- Same-domain deploy (Node serves UI + API) avoids most CORS issues

---

## Quick local production test

```bash
npm run build
cd server
NODE_ENV=production npm start
```

Open `http://localhost:4000`
