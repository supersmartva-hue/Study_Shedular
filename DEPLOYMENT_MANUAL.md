# 📖 COMPLETE STEP-BY-STEP DEPLOYMENT MANUAL

## **PART 1: GENERATE API KEYS (10 minutes)**

### Step 1A: Generate VAPID Keys (for push notifications)

**On Windows PowerShell:**

1. Open PowerShell (Windows key + type "PowerShell")
2. Run these commands:

```powershell
npm install -g web-push
web-push generate-vapid-keys
```

You'll see output like:
```
Public Key: BChu7_placeholder_actual_key_here_256_chars
Private Key: placeholder_actual_key_here_128_chars
```

**📝 Save these two keys in a text file!**

---

### Step 1B: Get Google Gemini API Key (Optional but recommended)

1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key" button
3. Copy the key
4. **📝 Save it!**

---

### Step 1C: (Optional) Other API Keys

- **OpenAI:** https://platform.openai.com/api-keys
- **Groq:** https://console.groq.com/keys  
- **Serper Search:** https://serper.dev/manage

*(These are optional - your app works without them)*

---

## **PART 2: PUSH CODE TO GITHUB (10 minutes)**

### Step 2A: Have Git Ready

1. Make sure Git is installed: Open PowerShell and type `git --version`
2. If not installed, download from: https://git-scm.com/download/win

---

### Step 2B: Run Deployment Setup Script

1. **Open PowerShell** (Windows key + type "PowerShell")
2. **Navigate to your project:**

```powershell
cd "F:\Projects Folder\Full app\smart-productivity"
```

3. **Run the setup script:**

```powershell
.\setup-deployment.ps1
```

4. **When prompted:**
   - Enter your GitHub username
   - For authentication, follow on-screen instructions
   - Paste your Personal Access Token when asked

✅ **Your code is now on GitHub!**

---

## **PART 3: UPDATE ENVIRONMENT VARIABLES (5 minutes)**

### Step 3A: Edit Production Environment File

1. Open file: `apps/api/.env.production`
2. Find and replace these placeholders:

**Find this line:**
```
GEMINI_API_KEY=AIzaSyD_placeholder_replace_with_real_key
```

**Replace with your actual key from Step 1B:**
```
GEMINI_API_KEY=AIzaSyD_xyz123abc456def789ghi
```

**Find this line:**
```
VAPID_PUBLIC_KEY=BHu7placeholder_replace_with_real_key
```

**Replace with your public key from Step 1A:**
```
VAPID_PUBLIC_KEY=BChu7_xyz123abc456def789ghi
```

**Find this line:**
```
VAPID_PRIVATE_KEY=placeholder_replace_with_real_key
```

**Replace with your private key from Step 1A:**
```
VAPID_PRIVATE_KEY=xyz123abc456def789ghi
```

**Find this line:**
```
VAPID_EMAIL=your-email@yourdomain.com
```

**Replace with your email:**
```
VAPID_EMAIL=youremail@gmail.com
```

3. **Save the file**

---

## **PART 4: CREATE DIGITALOCEAN ACCOUNT (5 minutes)**

### Step 4A: Sign Up

1. Go to: https://www.digitalocean.com
2. Click "Sign Up" (top right)
3. **EASIEST METHOD:**
   - Click "Sign up with GitHub"
   - Authorize with your GitHub account
   - Done! ✅

4. **Add Payment Method:**
   - Add credit/debit card
   - Don't worry, won't charge if free tier isn't used

---

## **PART 5: DEPLOY ON DIGITALOCEAN (15 minutes)**

### Step 5A: Create App Platform Project

1. **Log into DigitalOcean:** https://cloud.digitalocean.com
2. **On the sidebar, find "Apps"** (or go to: https://cloud.digitalocean.com/apps)
3. **Click "Create Apps"** (blue button)

---

### Step 5B: Connect Your GitHub Repository

1. **Select GitHub**
2. **Click "Authorize with GitHub"** (if needed)
3. **Select your repository:**
   - Repository: `smart-productivity`
   - Branch: `main`
4. **Click "Next"**

---

### Step 5C: Configure Services

#### **Service 1: API (Backend)**

1. **Service Name:** `api`
2. **Dockerfile:** Select `Dockerfile.api`
3. **Build Command:** (leave blank)
4. **Run Command:** (leave blank)
5. **HTTP Port:** `4000`
6. **Click "Save"**

#### **Service 2: Web (Frontend)**

1. **Click "Add Service"**
2. **Service Name:** `web`
3. **Dockerfile:** Select `Dockerfile.web`
4. **HTTP Port:** `3000`
5. **Click "Save"**

---

### Step 5D: Add Database

1. **Click "Add Resource"**
2. **Select "Database"**
3. **Select "PostgreSQL"**
4. **Name:** `db`
5. **Version:** `16`
6. **Size:** Basic ($15/month)
7. **Click "Create and Attach"**

---

### Step 5E: Set Environment Variables for API

1. **Click on the "api" service**
2. **Click "Edit"** tab
3. **Click "Environment"**
4. **Add these variables:**

For each line below, click "Add Variable" and paste:

```
DATABASE_URL=postgresql://smartuser:smartpass@db:5432/smartprod
JWT_SECRET=Kx9mP2qL7vN4rJ8sT1hB5cD3fG6wY0eA
JWT_REFRESH_SECRET=M8nK4pL9jH2rT6wS3vD1qB7xE5yF0cG
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GEMINI_API_KEY=[your-gemini-key-from-step-1b]
VAPID_PUBLIC_KEY=[your-public-key-from-step-1a]
VAPID_PRIVATE_KEY=[your-private-key-from-step-1a]
VAPID_EMAIL=your-email@yourdomain.com
CLIENT_URL=https://yourdomain.com
NODE_ENV=production
PORT=4000
```

**Replace:** `[your-gemini-key-from-step-1b]` with your actual Gemini API key

---

### Step 5F: Set Environment Variables for Web

1. **Click on the "web" service**
2. **Click "Edit"** tab
3. **Click "Environment"**
4. **Add this variable:**

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

### Step 5G: Deploy!

1. **Review all settings** (make sure everything is green ✓)
2. **Click "Deploy"** button (top right)
3. **Wait 3-5 minutes** for deployment
4. **Watch the logs** scroll by
5. **You should see:** "✓ Deployment successful"

✅ **Your app is deployed!**

---

## **PART 6: SETUP CUSTOM DOMAIN (10 minutes)**

### Step 6A: Add Domain to DigitalOcean

1. **Go back to your app**
2. **Click "Settings"** tab
3. **Click "Domains"**
4. **Click "Add Domain"**
5. **Enter:** `yourdomain.com` (without www)
6. **Select service:** `web`
7. **Click "Add Domain"**

8. **Add API domain:**
   - **Click "Add Domain"** again
   - **Enter:** `api.yourdomain.com`
   - **Select service:** `api`
   - **Click "Add Domain"**

9. **Note the Nameservers** that DigitalOcean shows (3 of them)

---

### Step 6B: Update Domain Registrar

1. **Where you bought your domain (GoDaddy, Namecheap, etc.):**
   - Log into your account

2. **Find "DNS" or "Nameservers"**

3. **Replace nameservers** with the 3 from DigitalOcean:
   - Delete current nameservers
   - Add DigitalOcean nameservers

4. **Save changes**

5. **Wait 5-30 minutes** for DNS to propagate

---

## **PART 7: TEST YOUR APP (5 minutes)**

### Step 7A: Test Frontend

1. **Open browser**
2. **Wait 30 minutes** for DNS (or test with temporary DigitalOcean URL)
3. **Visit:** `https://yourdomain.com`
4. **You should see:** Smart Productivity home page ✅

---

### Step 7B: Test API

1. **Open browser**
2. **Visit:** `https://api.yourdomain.com/health`
3. **You should see:** `{"ok":true}` or similar ✅

---

### Step 7C: Test Features

1. **Sign up** with an account
2. **Create a task**
3. **Test notifications** (enable push notifications)
4. **Visit** YouTube or Coursera
5. **Extension banner** should appear after 2.5 seconds

✅ **Everything works!**

---

## **PART 8: SHARE CHROME EXTENSION (5 minutes)**

### Step 8A: Package Extension

**On PowerShell:**

```powershell
cd "F:\Projects Folder\Full app\smart-productivity\apps\extension"

# Create zip file
Compress-Archive -Path . -DestinationPath "..\smart-productivity-extension.zip"
```

File created: `smart-productivity-extension.zip`

---

### Step 8B: Share with Users

**Option 1: GitHub Release (Easiest)**

1. **Go to:** `https://github.com/YOUR_USERNAME/smart-productivity/releases`
2. **Click "Create a new release"**
3. **Tag:** `v1.0.0`
4. **Title:** `Smart Productivity Extension v1.0.0`
5. **Upload file:** `smart-productivity-extension.zip`
6. **Publish release**

**Users install by:**
1. Download ZIP from release
2. Unzip folder
3. Open Chrome: `chrome://extensions`
4. Toggle "Developer mode" (top right)
5. Click "Load unpacked"
6. Select unzipped extension folder

**Option 2: Google Chrome Web Store (Pro)**

1. Create developer account: https://chrome.google.com/webstore/devconsole ($5)
2. Upload extension
3. Users can install directly from store

---

## **🎉 YOU'RE DONE!**

Your **complete app is now deployed** with:

✅ Frontend at `yourdomain.com`
✅ API at `api.yourdomain.com`
✅ Database running
✅ Push notifications enabled
✅ Chrome extension ready to share
✅ Tasks syncing across devices

---

## **📊 Monthly Costs**

| Service | Cost |
|---------|------|
| DigitalOcean (App + DB) | ~$27 |
| Domain | ~$1 |
| **Total** | **~$28/month** |

---

## **🆘 If Something Goes Wrong**

| Problem | Solution |
|---------|----------|
| Can't deploy | Check DigitalOcean logs → find error message |
| Can't reach domain | Wait 30 mins for DNS, then try again |
| Database error | Check DATABASE_URL is correct |
| API not responding | Check API logs in DigitalOcean |
| Notifications don't work | Check VAPID keys are set correctly |
| Extension not showing | Check extension is properly installed |

---

## **📞 Need Help?**

1. Check logs in DigitalOcean dashboard
2. Read `DEPLOYMENT.md` for detailed info
3. Check error messages carefully

**Good luck! 🚀**
