#!/bin/bash

# =============================================================================
# Vercel Deployment Script - สคริปต์ Deploy ไป Vercel อัตโนมัติ
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
ARROW="${BLUE}➜${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}Vercel Deployment Script${NC}                                    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Vercel CLI is installed
echo -e "${ARROW} ${CYAN}ตรวจสอบ Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${CROSS_MARK} Vercel CLI ไม่ได้ติดตั้ง"
    echo -e "${ARROW} กำลังติดตั้ง Vercel CLI..."
    npm install -g vercel
    echo -e "${CHECK_MARK} ติดตั้ง Vercel CLI เสร็จสิ้น"
else
    VERCEL_VERSION=$(vercel --version)
    echo -e "${CHECK_MARK} Vercel CLI: $VERCEL_VERSION"
fi

# Check if logged in
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบการ Login...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} ยังไม่ได้ login"
    echo -e "${ARROW} กำลัง login..."
    vercel login
else
    USER=$(vercel whoami)
    echo -e "${CHECK_MARK} Login แล้วเป็น: $USER"
fi

# Check Node.js and npm
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบ Node.js และ npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${CROSS_MARK} Node.js ไม่ได้ติดตั้ง"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${CHECK_MARK} Node.js: $NODE_VERSION"

if ! command -v npm &> /dev/null; then
    echo -e "${CROSS_MARK} npm ไม่ได้ติดตั้ง"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${CHECK_MARK} npm: $NPM_VERSION"

# Check .env.local
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบไฟล์ .env.local...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${CROSS_MARK} ไม่พบไฟล์ .env.local"
    echo -e "${YELLOW}⚠${NC} กรุณาสร้างไฟล์ .env.local ก่อน"
    exit 1
fi
echo -e "${CHECK_MARK} พบไฟล์ .env.local"

# Check if .env.local has required variables
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบ Environment Variables...${NC}"
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.local; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} พบ Environment Variables ที่ขาด: ${MISSING_VARS[*]}"
    echo -e "${ARROW} กรุณาเพิ่มในไฟล์ .env.local"
else
    echo -e "${CHECK_MARK} Environment Variables ครบถ้วน"
fi

# Install dependencies
echo ""
echo -e "${ARROW} ${CYAN}กำลังติดตั้ง dependencies...${NC}"
npm install
echo -e "${CHECK_MARK} ติดตั้ง dependencies เสร็จสิ้น"

# Generate Prisma Client
echo ""
echo -e "${ARROW} ${CYAN}กำลัง generate Prisma Client...${NC}"
npm run db:generate
echo -e "${CHECK_MARK} Generate Prisma Client เสร็จสิ้น"

# Build project
echo ""
echo -e "${ARROW} ${CYAN}กำลัง build project...${NC}"
npm run build
echo -e "${CHECK_MARK} Build เสร็จสิ้น"

# Deploy to Vercel
echo ""
echo -e "${ARROW} ${CYAN}กำลัง deploy ไป Vercel...${NC}"
echo -e "${YELLOW}⚠${NC} หมายเหตุ:"
echo -e "  - ถ้ายังไม่ได้ตั้งค่า Environment Variables ใน Vercel Dashboard"
echo -e "    กรุณาไปตั้งค่าที่: https://vercel.com/dashboard"
echo -e "  - ดูรายละเอียดใน VERCEL_DEPLOYMENT.md"
echo ""

read -p "$(echo -e ${CYAN}ต้องการ deploy ไป Vercel ตอนนี้หรือไม่? ${NC}[${GREEN}Y${NC}/n]: )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo ""
    echo -e "${ARROW} ${CYAN}Deploying...${NC}"
    vercel --prod
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${GREEN}🎉 Deploy สำเร็จ!${NC}                                           ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${ARROW} ${CYAN}ขั้นตอนต่อไป:${NC}"
    echo -e "  1. ไปที่ Vercel Dashboard เพื่อตั้งค่า Environment Variables"
    echo -e "  2. ตรวจสอบ URL ที่ Vercel ให้มา"
    echo -e "  3. อัปเดต NEXTAUTH_URL ใน Environment Variables"
    echo -e "  4. Redeploy เพื่อให้ environment variables มีผล"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} ข้ามการ deploy"
    echo -e "${ARROW} รันคำสั่งนี้เมื่อพร้อม: ${CYAN}vercel --prod${NC}"
fi
