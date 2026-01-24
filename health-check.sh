#!/bin/bash

# =============================================================================
# Health Check Script - ตรวจสอบสถานะระบบ
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
WARNING="${YELLOW}⚠${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}Health Check - ตรวจสอบสถานะระบบ${NC}                      ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check Node.js
echo -e "${BLUE}[1/10]${NC} ตรวจสอบ Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo -e "  ${CHECK_MARK} Node.js: $NODE_VERSION"
    else
        echo -e "  ${WARNING} Node.js version ต่ำเกินไป: $NODE_VERSION (ต้องการ >= 18)"
        ((WARNINGS++))
    fi
else
    echo -e "  ${CROSS_MARK} Node.js ไม่ได้ติดตั้ง"
    ((ERRORS++))
fi

# Check npm
echo -e "${BLUE}[2/10]${NC} ตรวจสอบ npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "  ${CHECK_MARK} npm: $NPM_VERSION"
else
    echo -e "  ${CROSS_MARK} npm ไม่ได้ติดตั้ง"
    ((ERRORS++))
fi

# Check PM2
echo -e "${BLUE}[3/10]${NC} ตรวจสอบ PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo -e "  ${CHECK_MARK} PM2: $PM2_VERSION"
    
    # Check PM2 status
    if pm2 list | grep -q "inbox-nextjs"; then
        STATUS=$(pm2 list | grep "inbox-nextjs" | awk '{print $10}')
        if [ "$STATUS" = "online" ]; then
            echo -e "  ${CHECK_MARK} inbox-nextjs status: online"
        else
            echo -e "  ${CROSS_MARK} inbox-nextjs status: $STATUS"
            ((ERRORS++))
        fi
    else
        echo -e "  ${WARNING} inbox-nextjs ไม่ได้รันใน PM2"
        ((WARNINGS++))
    fi
else
    echo -e "  ${WARNING} PM2 ไม่ได้ติดตั้ง"
    ((WARNINGS++))
fi

# Check .env.local
echo -e "${BLUE}[4/10]${NC} ตรวจสอบ .env.local..."
if [ -f ".env.local" ]; then
    echo -e "  ${CHECK_MARK} .env.local exists"
    
    # Check required variables
    if grep -q "DATABASE_URL" .env.local; then
        echo -e "  ${CHECK_MARK} DATABASE_URL configured"
    else
        echo -e "  ${CROSS_MARK} DATABASE_URL missing"
        ((ERRORS++))
    fi
    
    if grep -q "NEXTAUTH_SECRET" .env.local; then
        echo -e "  ${CHECK_MARK} NEXTAUTH_SECRET configured"
    else
        echo -e "  ${CROSS_MARK} NEXTAUTH_SECRET missing"
        ((ERRORS++))
    fi
    
    if grep -q "LINE_CHANNEL_ACCESS_TOKEN" .env.local; then
        echo -e "  ${CHECK_MARK} LINE_CHANNEL_ACCESS_TOKEN configured"
    else
        echo -e "  ${WARNING} LINE_CHANNEL_ACCESS_TOKEN missing"
        ((WARNINGS++))
    fi
else
    echo -e "  ${CROSS_MARK} .env.local not found"
    ((ERRORS++))
fi

# Check node_modules
echo -e "${BLUE}[5/10]${NC} ตรวจสอบ dependencies..."
if [ -d "node_modules" ]; then
    echo -e "  ${CHECK_MARK} node_modules exists"
    
    # Count packages
    PACKAGE_COUNT=$(ls -1 node_modules | wc -l)
    echo -e "  ${CHECK_MARK} Installed packages: $PACKAGE_COUNT"
else
    echo -e "  ${CROSS_MARK} node_modules not found - รัน: npm install"
    ((ERRORS++))
fi

# Check Prisma Client
echo -e "${BLUE}[6/10]${NC} ตรวจสอบ Prisma..."
if [ -d "node_modules/.prisma" ]; then
    echo -e "  ${CHECK_MARK} Prisma Client generated"
else
    echo -e "  ${CROSS_MARK} Prisma Client not generated - รัน: npm run db:generate"
    ((ERRORS++))
fi

# Check .next build
echo -e "${BLUE}[7/10]${NC} ตรวจสอบ Next.js build..."
if [ -d ".next" ]; then
    echo -e "  ${CHECK_MARK} .next directory exists"
    
    if [ -f ".next/BUILD_ID" ]; then
        BUILD_ID=$(cat .next/BUILD_ID)
        echo -e "  ${CHECK_MARK} Build ID: $BUILD_ID"
    fi
else
    echo -e "  ${CROSS_MARK} .next not found - รัน: npm run build"
    ((ERRORS++))
fi

# Check port 3000
echo -e "${BLUE}[8/10]${NC} ตรวจสอบ port 3000..."
if lsof -i :3000 &> /dev/null; then
    echo -e "  ${CHECK_MARK} Port 3000 is in use (application running)"
    
    # Try to curl
    if curl -s http://localhost:3000 &> /dev/null; then
        echo -e "  ${CHECK_MARK} Application responds on port 3000"
    else
        echo -e "  ${WARNING} Port 3000 in use but application not responding"
        ((WARNINGS++))
    fi
else
    echo -e "  ${WARNING} Port 3000 is not in use (application not running?)"
    ((WARNINGS++))
fi

# Check Nginx
echo -e "${BLUE}[9/10]${NC} ตรวจสอบ Nginx..."
if command -v nginx &> /dev/null; then
    echo -e "  ${CHECK_MARK} Nginx installed"
    
    if systemctl is-active --quiet nginx; then
        echo -e "  ${CHECK_MARK} Nginx is running"
    else
        echo -e "  ${WARNING} Nginx is not running"
        ((WARNINGS++))
    fi
    
    # Check Nginx config
    if nginx -t &> /dev/null; then
        echo -e "  ${CHECK_MARK} Nginx config is valid"
    else
        echo -e "  ${CROSS_MARK} Nginx config has errors"
        ((ERRORS++))
    fi
else
    echo -e "  ${WARNING} Nginx not installed"
    ((WARNINGS++))
fi

# Check MySQL connection
echo -e "${BLUE}[10/10]${NC} ตรวจสอบ MySQL connection..."
if command -v mysql &> /dev/null; then
    echo -e "  ${CHECK_MARK} MySQL client installed"
    
    # Try to extract DB info from .env.local
    if [ -f ".env.local" ]; then
        DB_URL=$(grep "DATABASE_URL" .env.local | cut -d'"' -f2)
        if [ -n "$DB_URL" ]; then
            echo -e "  ${CHECK_MARK} Database URL configured"
        fi
    fi
else
    echo -e "  ${WARNING} MySQL client not installed"
    ((WARNINGS++))
fi

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ระบบทำงานปกติ!${NC}"
    echo ""
    echo -e "Application URL: ${GREEN}http://localhost:3000/inbox${NC}"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ ระบบทำงานได้ แต่มีคำเตือน: $WARNINGS${NC}"
    echo ""
    echo -e "กรุณาตรวจสอบคำเตือนด้านบน"
    echo ""
else
    echo -e "${RED}❌ พบข้อผิดพลาด: $ERRORS${NC}"
    echo -e "${YELLOW}⚠ คำเตือน: $WARNINGS${NC}"
    echo ""
    echo -e "กรุณาแก้ไขข้อผิดพลาดด้านบนก่อนใช้งาน"
    echo ""
fi

# Useful commands
echo -e "${BLUE}คำสั่งที่มีประโยชน์:${NC}"
echo ""
echo "  pm2 status              - ดู PM2 status"
echo "  pm2 logs inbox-nextjs   - ดู application logs"
echo "  pm2 restart inbox-nextjs - restart application"
echo "  npm run db:studio       - เปิด Prisma Studio"
echo "  nginx -t                - ทดสอบ Nginx config"
echo ""

exit $ERRORS
