#!/bin/bash

# Deploy script สำหรับ Inbox Next.js
# ใช้สำหรับอัปโหลดและติดตั้งบน production server

echo "🚀 Starting deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="your_username"
REMOTE_HOST="your_server_ip"
REMOTE_PATH="/var/www/inbox-nextjs"
LOCAL_PATH="."

echo -e "${YELLOW}📦 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

echo -e "${YELLOW}📤 Uploading files to server...${NC}"

# Upload files (excluding node_modules, .next, etc.)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude 'dev.db' \
    --exclude 'prisma/dev.db' \
    --exclude '.git' \
    "$LOCAL_PATH/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Upload successful${NC}"

echo -e "${YELLOW}🔧 Installing dependencies on server...${NC}"

# SSH to server and run commands
ssh "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
cd /var/www/inbox-nextjs

# Install dependencies
npm install --production

# Generate Prisma Client
npm run db:generate

# Push database schema (if needed)
npm run db:push --accept-data-loss

# Restart PM2
pm2 restart inbox-nextjs

# Show status
pm2 status

echo "✅ Deployment completed!"
ENDSSH

echo -e "${GREEN}🎉 Deployment finished!${NC}"
echo -e "${YELLOW}📊 Check logs: ssh $REMOTE_USER@$REMOTE_HOST 'pm2 logs inbox-nextjs'${NC}"
