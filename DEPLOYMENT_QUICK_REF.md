# 🚀 Deployment Quick Reference

## **Local Testing (Before Deployment)**

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Start all services with Docker
docker-compose up

# 4. Access services
# Frontend: http://localhost:3000
# API: http://localhost:4000
# Database: localhost:5432

# 5. Run migrations (if needed)
docker exec smartprod_api npx prisma migrate dev

# 6. View logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres

# 7. Stop services
docker-compose down
```

---

## **Deploy to DigitalOcean App Platform (Recommended)**

```bash
# 1. Create GitHub repository
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/smart-productivity.git
git branch -M main
git push -u origin main

# 2. Go to DigitalOcean: https://cloud.digitalocean.com
# - Click "Create" → "Apps"
# - Select GitHub repository
# - Add 2 services:
#   * api (Dockerfile.api, PORT 4000)
#   * web (Dockerfile.web, PORT 3000)
# - Add managed PostgreSQL
# - Set environment variables
# - Deploy

# 3. Add custom domains
# - Go to App Settings → Domains
# - Add: yourdomain.com, api.yourdomain.com

# 4. Setup DNS
# - Add CNAME records pointing to DigitalOcean
```

---

## **Deploy to Vercel + Railway**

```bash
# Frontend on Vercel
# 1. Connect GitHub repo: https://vercel.com/new
# 2. Select apps/web directory
# 3. Set env: NEXT_PUBLIC_API_URL=https://api-yourdomain.railway.app
# 4. Deploy (auto on push)

# Backend on Railway
# 1. Go to Railway: https://railway.app/new
# 2. Create new project, connect GitHub
# 3. Add Dockerfile.api
# 4. Add PostgreSQL plugin
# 5. Set environment variables
# 6. Deploy
```

---

## **Deploy to AWS EC2**

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t3.small)
ssh -i your-key.pem ubuntu@your-instance-ip

# 2. Install dependencies
sudo apt update && sudo apt install -y docker.io docker-compose git

# 3. Clone repository
git clone https://github.com/YOUR_USERNAME/smart-productivity.git
cd smart-productivity

# 4. Create .env file
cp .env.example .env
nano .env  # Edit with your values

# 5. Start services
docker-compose up -d

# 6. Install Nginx & SSL
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# 7. Configure Nginx (see DEPLOYMENT.md for full config)
sudo nano /etc/nginx/sites-available/default

# 8. Restart Nginx
sudo systemctl restart nginx

# 9. Enable auto-renewal of SSL
sudo systemctl enable certbot.timer
```

---

## **Production Maintenance**

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f web

# Backup database
docker exec smartprod_db pg_dump -U smartuser smartprod > backup.sql

# Restore database
docker exec -i smartprod_db psql -U smartuser smartprod < backup.sql

# Update application
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check system health
docker ps
docker stats

# Restart service
docker-compose restart api
docker-compose restart web

# View database
docker exec -it smartprod_db psql -U smartuser -d smartprod

# Clear Docker resources
docker system prune -a
```

---

## **Troubleshooting**

```bash
# API not connecting to database
docker-compose logs api | grep ERROR

# Frontend can't reach API
# Check: NEXT_PUBLIC_API_URL in environment

# Port already in use
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it

# Out of disk space
docker system prune -a --volumes

# Database connection issues
docker exec smartprod_db pg_isready -U smartuser
```

---

## **Security Checklist**

- [ ] Change default JWT secrets
- [ ] Use HTTPS everywhere
- [ ] Enable CORS restrictions
- [ ] Setup firewall rules
- [ ] Enable database backups
- [ ] Monitor error logs
- [ ] Update dependencies regularly
- [ ] Use environment variables (never hardcode)
- [ ] Setup rate limiting
- [ ] Enable helmet.js security headers

---

## **Estimated Timeline**

| Step | Time |
|------|------|
| Setup Docker locally | 5 min |
| Test locally | 15 min |
| Setup DigitalOcean account | 5 min |
| Configure environment variables | 10 min |
| Deploy services | 10 min |
| Setup custom domains | 5 min |
| **Total** | **~50 min** |

---

## **Cost Breakdown (Monthly)**

| Component | Option | Cost |
|-----------|--------|------|
| **Frontend** | Vercel (FREE) or DigitalOcean | $0-12 |
| **Backend** | Railway/DigitalOcean/EC2 | $7-30 |
| **Database** | Managed PostgreSQL | $15-25 |
| **Domain** | GoDaddy/Namecheap | $1-12 |
| **Total** | Recommended Setup | **~$40/month** |

---

## **Support Resources**

- 📚 Full Deployment Guide: `DEPLOYMENT.md`
- 🔧 Environment Variables: `.env.example`
- 🐳 Docker Compose: `docker-compose.yml`
- 📱 Extension: `apps/extension/`
- 🚀 Backend: `apps/api/`
- 🎨 Frontend: `apps/web/`

**Happy deploying! 🎉**
