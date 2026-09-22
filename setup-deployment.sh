#!/bin/bash
# 🚀 Smart Productivity - Local Deployment Setup Script
# Run this script to prepare everything for deployment

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Smart Productivity - Deployment Setup Script             ║"
echo "║   This will prepare your code for DigitalOcean             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if git is initialized
echo -e "${BLUE}STEP 1: Checking Git Setup...${NC}"
if [ -d .git ]; then
    echo -e "${GREEN}✓ Git repository already initialized${NC}"
else
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    echo -e "${GREEN}✓ Git initialized${NC}"
fi
echo ""

# Step 2: Check for uncommitted changes
echo -e "${BLUE}STEP 2: Preparing Files...${NC}"
git add .
echo -e "${GREEN}✓ All files staged${NC}"
echo ""

# Step 3: Create initial commit
echo -e "${BLUE}STEP 3: Creating Initial Commit...${NC}"
if git diff --cached --quiet; then
    echo -e "${YELLOW}No changes to commit${NC}"
else
    git commit -m "Initial commit - Smart Productivity app with push notifications, unified tasks, and Chrome extension"
    echo -e "${GREEN}✓ Commit created${NC}"
fi
echo ""

# Step 4: Add GitHub remote
echo -e "${BLUE}STEP 4: Setting up GitHub Remote...${NC}"
echo ""
echo -e "${YELLOW}Enter your GitHub username:${NC}"
read GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}✗ GitHub username cannot be empty${NC}"
    exit 1
fi

REPO_URL="https://github.com/$GITHUB_USERNAME/smart-productivity.git"

# Check if remote already exists
if git remote get-url origin > /dev/null 2>&1; then
    echo -e "${YELLOW}Remote already exists. Updating...${NC}"
    git remote set-url origin "$REPO_URL"
else
    git remote add origin "$REPO_URL"
fi

echo -e "${GREEN}✓ Remote set to: $REPO_URL${NC}"
echo ""

# Step 5: Push to GitHub
echo -e "${BLUE}STEP 5: Pushing to GitHub...${NC}"
echo -e "${YELLOW}This may prompt for authentication. Use:${NC}"
echo "  Username: $GITHUB_USERNAME"
echo "  Password: Your GitHub Personal Access Token (from https://github.com/settings/tokens)"
echo ""

git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub!${NC}"
else
    echo -e "${RED}✗ Failed to push to GitHub${NC}"
    echo "Try again with: git push -u origin main"
    exit 1
fi
echo ""

# Step 6: Verify deployment files
echo -e "${BLUE}STEP 6: Verifying Deployment Files...${NC}"
FILES=(
    "Dockerfile.api"
    "Dockerfile.web"
    "docker-compose.yml"
    "DEPLOYMENT.md"
    ".env.example"
    "apps/api/.env.production"
    "apps/web/.env.production"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file (missing)${NC}"
    fi
done
echo ""

# Step 7: Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✓ LOCAL SETUP COMPLETE!${NC}"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  SETUP API KEYS (get these from free services):"
echo "   • Google Gemini: https://aistudio.google.com/app/apikey"
echo "   • VAPID Keys: npm install -g web-push && web-push generate-vapid-keys"
echo ""
echo "2️⃣  UPDATE ENVIRONMENT VARIABLES:"
echo "   • Edit: apps/api/.env.production"
echo "   • Add your API keys"
echo ""
echo "3️⃣  CREATE DIGITALOCEAN ACCOUNT:"
echo "   • Go to: https://www.digitalocean.com"
echo "   • Sign up and add payment method"
echo ""
echo "4️⃣  DEPLOY ON DIGITALOCEAN:"
echo "   • Go to: https://cloud.digitalocean.com/apps"
echo "   • Create new App Platform"
echo "   • Connect your GitHub repo: $REPO_URL"
echo "   • Add services (API, Web, Database)"
echo "   • Set environment variables"
echo "   • Deploy!"
echo ""
echo "📚 For detailed instructions, see:"
echo "   • DEPLOYMENT.md (comprehensive guide)"
echo "   • DEPLOYMENT_QUICK_REF.md (commands reference)"
echo ""
echo -e "${GREEN}Your code is now on GitHub and ready to deploy!${NC}"
echo ""
