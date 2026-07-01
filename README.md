# Aqua Vèntèra — Backend System

## Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3) — zero-config, production-ready for this scale
- **Email**: Nodemailer (SMTP — works with Gmail, SendGrid, Mailgun, etc.)
- **Auth**: JWT via secure httpOnly cookie with CSRF protection
- **File uploads**: Multer

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your SMTP credentials and secrets

# 3. Create admin account
npm run seed

# 4. Start server
npm start          # production
npm run dev        # development (auto-reload)
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/enquiry` | Submit consultation form (+ file upload) |
| GET | `/api/enquiry/track/:ref` | Check enquiry status by reference |
| GET | `/api/health` | Server health check |

### Admin (JWT Bearer token required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Admin login → returns JWT |
| GET | `/api/admin/dashboard` | Stats + recent enquiries |
| GET | `/api/admin/enquiries` | List all enquiries (paginated, filterable) |
| GET | `/api/admin/enquiries/:id` | Full enquiry detail |
| PATCH | `/api/admin/enquiries/:id` | Update status / notes / price |
| DELETE | `/api/admin/enquiries/:id` | Delete enquiry |
| GET | `/api/admin/activity` | Activity log |
| POST | `/api/admin/change-password` | Change admin password |

## Deployment (Ubuntu VPS)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone project
git clone your-repo /var/www/aquaventera
cd /var/www/aquaventera

# Install + configure
npm install --production
cp .env.example .env
nano .env  # fill in all values
npm run seed

# Run with PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js --name aquaventera
pm2 save
pm2 startup

# Nginx reverse proxy config
sudo nano /etc/nginx/sites-available/aquaventera
```

### Nginx config
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    client_max_body_size 15M;
    
    location / {
        proxy_pass http://localhost:3000;
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

```bash
# Enable site + SSL (Let's Encrypt)
sudo ln -s /etc/nginx/sites-available/aquaventera /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

## File Structure
```
aquaventera/
├── server.js           # Express app entry point
├── .env.example        # Environment template
├── package.json
├── db/
│   ├── database.js     # SQLite schema + singleton
│   └── seed.js         # Admin account creator
├── routes/
│   ├── enquiry.js      # Public form submission
│   └── admin.js        # Admin CRUD API
├── middleware/
│   ├── auth.js         # JWT verification
│   └── upload.js       # Multer config
├── services/
│   └── email.js        # Nodemailer templates
├── views/
│   └── admin.html      # Admin dashboard SPA
├── public/
│   └── index.html      # Main website (copy from output)
└── data/               # Auto-created, gitignored
    ├── aquaventera.db   # SQLite database
    └── uploads/        # Moodboard files
```
>>>>>>> db2e6e5 (Initial commit)
