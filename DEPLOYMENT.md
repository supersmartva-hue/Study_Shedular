# 🚀 Smart Productivity — Deployment Guide

Complete instructions for deploying the full-stack application.

## **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                  Chrome Extension                           │
│         (Captures tasks from educational websites)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Frontend (Next.js 15)                          │
│         http://yourdomain.com                              │
│  • React 19                                                │
│  • Tailwind CSS                                            │
│  • Push Notifications                                      │
│  • PWA Support                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Backend API (Express.js)                       │
│         http://api.yourdomain.com                          │
│  • Node.js 22                                              │
│  • TypeScript                                              │
│  • JWT Auth                                                │
│  • Prisma ORM                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│        Database (PostgreSQL 16)                             │
│     Managed or Self-Hosted                                │
└─────────────────────────────────────────────────────────────┘
```

---

## **🌍 Deployment Options**

### **Option A: Docker + DigitalOcean App Platform (Easiest)**

**Cost**: ~$12/month (1 shared server)  
**Complexity**: ⭐⭐ (Very Easy)  
**Uptime**: 99.9%

#### **Step 1: Create DigitalOcean Account**
1. Sign up at https://digitalocean.com
2. Add payment method
3. Create a new App Platform project

#### **Step 2: Prepare GitHub Repository**
```bash
# Push your code to GitHub
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/smart-productivity.git
git push -u origin main
```

#### **Step 3: Deploy via DigitalOcean Console**
1. In App Platform, click "Create App"
2. Select GitHub repository
3. Add services:
   - **Name**: api-service
   - **Source**: `Dockerfile.api`
   - **Port**: 4000
   - **Env**: Set all required env vars (see below)
   
   - **Name**: web-service
   - **Source**: `Dockerfile.web`
   - **Port**: 3000
   - **Env**: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

4. Add PostgreSQL database (managed)
5. Set `DATABASE_URL` to the connection string

#### **Step 4: Set Environment Variables in DigitalOcean**
```
JWT_SECRET=your-super-secret-key-minimum-16-chars
JWT_REFRESH_SECRET=your-refresh-secret-minimum-16-chars
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
SERPER_API_KEY=your-serper-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private
VAPID_EMAIL=your-email@example.com
NODE_ENV=production
```

#### **Step 5: Custom Domains**
1. Go to App Settings → Domains
2. Add `api.yourdomain.com` and `yourdomain.com`
3. Point DNS records to DigitalOcean

---

### **Option B: Vercel + Railway (Recommended)**

**Cost**: ~$20/month  
**Complexity**: ⭐⭐⭐ (Very Easy)  
**Uptime**: 99.9%+

#### **Frontend on Vercel (FREE)**
1. Push code to GitHub
2. Go to https://vercel.com/dashboard
3. Click "Add New Project"
4. Select your GitHub repo
5. Set `NEXT_PUBLIC_API_URL=https://api-yourdomain.railway.app`
6. Deploy (automatic on every push)

#### **Backend on Railway**
1. Go to https://railway.app
2. Create new project
3. Connect GitHub repository
4. Add `Dockerfile.api` to build settings
5. Add environment variables:
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
# etc (all from above)
```
6. Connect PostgreSQL plugin
7. Deploy

#### **Chrome Extension on GitHub Releases**
1. Zip the `/apps/extension` folder
2. Create GitHub release
3. Upload as asset
4. Users download and install manually

---

### **Option C: AWS EC2 + RDS (Most Scalable)**

**Cost**: ~$30+/month  
**Complexity**: ⭐⭐⭐⭐⭐ (Advanced)  
**Uptime**: 99.99%

#### **Setup Steps:**
1. **Create EC2 instance** (Ubuntu 22.04, t3.small)
2. **Install Docker & Docker Compose**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
```

3. **Clone repository**
```bash
git clone https://github.com/YOUR_USERNAME/smart-productivity.git
cd smart-productivity
```

4. **Create .env file**
```bash
cat > .env << EOF
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
GEMINI_API_KEY=your-key
# ... all other vars
EOF
```

5. **Start with Docker Compose**
```bash
docker-compose up -d
```

6. **Setup Nginx reverse proxy**
```bash
sudo apt install nginx -y
```

7. **Get SSL certificate with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com
```

8. **Configure Nginx**
```nginx
# /etc/nginx/sites-available/default
server {
    server_name yourdomain.com;
    listen 443 ssl;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}

server {
    server_name api.yourdomain.com;
    listen 443 ssl;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
    }
}
```

---

## **📱 Chrome Extension Deployment**

### **For Users (Private Distribution)**

1. **Package the extension**
```bash
cd apps/extension
zip -r smart-productivity.zip .
```

2. **Share with users**
   - Upload to GitHub Releases
   - Share via email/Discord
   - Users install via `chrome://extensions` → Load unpacked

3. **For Public Distribution (Google Web Store)**
   - Create developer account ($5 one-time)
   - Upload signed extension
   - Goes through review (~2-3 hours)
   - Users install from Chrome Web Store

---

## **🔧 Environment Variables Checklist**

### **Required (No app without these)**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 32+ character random string
- `JWT_REFRESH_SECRET` — 32+ character random string

### **Optional (Features degrade gracefully)**
- `GEMINI_API_KEY` — Google Gemini for AI features
- `OPENAI_API_KEY` — OpenAI GPT for alt AI
- `GROQ_API_KEY` — Groq for fast inference
- `SERPER_API_KEY` — Search results
- `CLOUDINARY_*` — Image upload/storage
- `VAPID_*` — Web push notifications
- `GOOGLE_SEARCH_API_KEY` — Google Custom Search

### **Generate Secrets**
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

---

## **📊 Monitoring & Maintenance**

### **Health Checks**
```bash
# Check API health
curl https://api.yourdomain.com/health

# Check database
docker exec smartprod_db psql -U smartuser -d smartprod -c "SELECT 1"
```

### **View Logs**
```bash
# API logs
docker logs smartprod_api -f

# Web logs
docker logs smartprod_web -f

# Database logs
docker logs smartprod_db -f
```

### **Database Backups**
```bash
# Backup
docker exec smartprod_db pg_dump -U smartuser smartprod > backup.sql

# Restore
docker exec -i smartprod_db psql -U smartuser smartprod < backup.sql
```

### **Updates**
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## **🛡️ Security Checklist**

- [ ] Enable HTTPS (SSL certificates)
- [ ] Set strong JWT secrets (32+ chars, random)
- [ ] Enable CORS on API (restrict to your domain)
- [ ] Setup rate limiting (already in Express)
- [ ] Enable helmet.js headers (already in Express)
- [ ] Use environment variables (NEVER hardcode secrets)
- [ ] Regular database backups
- [ ] Monitor error logs
- [ ] Update dependencies monthly

---

## **💰 Cost Estimate**

| Provider | Frontend | Backend | Database | Total/Month |
|----------|----------|---------|----------|------------|
| **Vercel + Railway** | FREE | $7 | $25 | ~$32 |
| **DigitalOcean App** | Included | Included | Included | $12 |
| **AWS EC2** | ~$10 | ~$10 | $15 | ~$35 |
| **Self-Hosted** | $5 | $5 | FREE | ~$10 |

---

## **📞 Next Steps**

1. Choose deployment provider
2. Generate strong JWT secrets
3. Get API keys (Gemini, OpenAI, etc.)
4. Test locally with docker-compose first
5. Deploy backend
6. Deploy frontend
7. Setup custom domain
8. Enable monitoring
9. Package extension for users

**Need help?** Check logs: `docker logs <service-name> -f`
