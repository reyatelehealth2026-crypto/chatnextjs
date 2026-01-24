#!/bin/bash

# =============================================================================
# Push to GitHub Script - สคริปต์ Push Code ไป GitHub
# =============================================================================

set -e

# NOTE (Windows):
# - แนะนำให้รันผ่าน Git Bash หรือ WSL: `bash ./push-to-github.sh`

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

die() {
    echo -e "${CROSS_MARK} $1"
    exit 1
}

scan_for_secrets() {
    echo ""
    echo -e "${ARROW} ${CYAN}ตรวจสอบไฟล์ก่อน commit (กันเผลอ push secret)...${NC}"

    # Scan tracked + untracked (but not ignored) files for common secrets.
    # If found, abort the commit/push.
    local files
    files=$(git ls-files -co --exclude-standard) || true

    if [ -z "$files" ]; then
        echo -e "${CHECK_MARK} ไม่พบไฟล์ให้ตรวจสอบ"
        return 0
    fi

    local found=0

    # 1) Prisma Accelerate api_key (allow placeholder YOUR_API_KEY)
    if echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "accelerate\.prisma-data\.net/\\?api_key=" "{}" 2>/dev/null || true' \
        | grep -v "api_key=YOUR_API_KEY" >/dev/null 2>&1; then
        found=1
        echo -e "${RED}พบ Prisma Accelerate api_key ในไฟล์:${NC}"
        echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "accelerate\.prisma-data\.net/\\?api_key=" "{}" 2>/dev/null || true' \
            | grep -v "api_key=YOUR_API_KEY" || true
        echo ""
        echo -e "${YELLOW}แก้ไข:${NC} ลบ/แทนที่เป็น placeholder แล้วไป Rotate/Revoke key ใน Prisma Console"
    fi

    # 2) LINE tokens/secrets
    if echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "LINE_CHANNEL_ACCESS_TOKEN=\".{10,}\"|LINE_CHANNEL_SECRET=\".{10,}\"" "{}" 2>/dev/null || true' \
        | grep -v 'LINE_CHANNEL_ACCESS_TOKEN=""' \
        | grep -v 'LINE_CHANNEL_SECRET=""' >/dev/null 2>&1; then
        found=1
        echo -e "${RED}พบ LINE token/secret ในไฟล์:${NC}"
        echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "LINE_CHANNEL_ACCESS_TOKEN=\".{10,}\"|LINE_CHANNEL_SECRET=\".{10,}\"" "{}" 2>/dev/null || true' \
            | grep -v 'LINE_CHANNEL_ACCESS_TOKEN=""' \
            | grep -v 'LINE_CHANNEL_SECRET=""' || true
        echo ""
        echo -e "${YELLOW}แก้ไข:${NC} ลบออกจากไฟล์ตัวอย่าง แล้วออก token ใหม่ใน LINE Developers (ถ้าจำเป็น)"
    fi

    # 3) MySQL credentials in URL (allow placeholder)
    if echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "mysql://[^\"[:space:]]+:[^\"[:space:]]+@[^\"[:space:]]+" "{}" 2>/dev/null || true' \
        | grep -v "mysql://user:password@" \
        | grep -v "YOUR_SERVER_PUBLIC_IP" >/dev/null 2>&1; then
        found=1
        echo -e "${RED}พบ MySQL URL ที่มี user/password ในไฟล์:${NC}"
        echo "$files" | xargs -I{} sh -c 'test -f "{}" && grep -nE "mysql://[^\"[:space:]]+:[^\"[:space:]]+@[^\"[:space:]]+" "{}" 2>/dev/null || true' \
            | grep -v "mysql://user:password@" \
            | grep -v "YOUR_SERVER_PUBLIC_IP" || true
        echo ""
        echo -e "${YELLOW}แก้ไข:${NC} ย้ายค่าไป Vercel Environment Variables และใส่ในไฟล์ตัวอย่างเป็น placeholder เท่านั้น"
    fi

    if [ "$found" -eq 1 ]; then
        echo ""
        die "หยุดการ commit/push เพราะพบ secret ในไฟล์ (เพื่อความปลอดภัย)"
    fi

    echo -e "${CHECK_MARK} ไม่พบ secret ที่เข้าข่ายอันตราย"
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${CYAN}Push to GitHub Script${NC}                                    ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if git is installed
echo -e "${ARROW} ${CYAN}ตรวจสอบ Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${CROSS_MARK} Git ไม่ได้ติดตั้ง"
    exit 1
fi
GIT_VERSION=$(git --version)
echo -e "${CHECK_MARK} $GIT_VERSION"

# Check if in git repository
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบ Git Repository...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${CROSS_MARK} ไม่ใช่ Git Repository"
    echo -e "${ARROW} กำลัง initialize Git Repository..."
    git init
    echo -e "${CHECK_MARK} Initialize Git Repository เสร็จสิ้น"
else
    echo -e "${CHECK_MARK} พบ Git Repository"
fi

# Check git status
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบสถานะ Git...${NC}"
git status --short

# Check if remote exists
echo ""
echo -e "${ARROW} ${CYAN}ตรวจสอบ Remote Repository...${NC}"
if ! git remote | grep -q "origin"; then
    echo -e "${YELLOW}⚠${NC} ยังไม่มี remote repository"
    echo -e "${ARROW} กรุณาเพิ่ม remote repository:"
    echo -e "  ${CYAN}git remote add origin https://github.com/USERNAME/REPO.git${NC}"
    echo ""
    read -p "$(echo -e ${CYAN}ต้องการเพิ่ม remote repository ตอนนี้หรือไม่? ${NC}[${GREEN}Y${NC}/n]: )" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        read -p "$(echo -e ${CYAN}GitHub Repository URL: ${NC})" REPO_URL
        if [ -n "$REPO_URL" ]; then
            git remote add origin "$REPO_URL"
            echo -e "${CHECK_MARK} เพิ่ม remote repository เสร็จสิ้น"
        fi
    else
        echo -e "${YELLOW}⚠${NC} ข้ามการเพิ่ม remote repository"
        exit 1
    fi
else
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${CHECK_MARK} Remote: $REMOTE_URL"
fi

# Add files
echo ""
echo -e "${ARROW} ${CYAN}กำลังเพิ่มไฟล์...${NC}"
scan_for_secrets
git add .
echo -e "${CHECK_MARK} เพิ่มไฟล์เสร็จสิ้น"

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠${NC} ไม่มีไฟล์ที่เปลี่ยนแปลง"
else
    # Commit
    echo ""
    echo -e "${ARROW} ${CYAN}กำลัง commit...${NC}"
    read -p "$(echo -e ${CYAN}Commit message ${NC}[${GREEN}Update inbox-nextjs${NC}]: )" COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"Update inbox-nextjs"}
    git commit -m "$COMMIT_MSG"
    echo -e "${CHECK_MARK} Commit เสร็จสิ้น"
fi

# Push
echo ""
echo -e "${ARROW} ${CYAN}กำลัง push ไป GitHub...${NC}"
read -p "$(echo -e ${CYAN}ต้องการ push ไป GitHub ตอนนี้หรือไม่? ${NC}[${GREEN}Y${NC}/n]: )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    echo ""
    echo -e "${ARROW} ${CYAN}Pushing to origin/$CURRENT_BRANCH...${NC}"
    git push -u origin "$CURRENT_BRANCH"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${GREEN}🎉 Push สำเร็จ!${NC}                                           ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${ARROW} ${CYAN}ขั้นตอนต่อไป:${NC}"
    echo -e "  1. ไปที่ GitHub เพื่อตรวจสอบ code"
    echo -e "  2. ไปที่ Vercel Dashboard → Import Project จาก GitHub"
    echo -e "  3. ตั้งค่า Environment Variables"
    echo -e "  4. Deploy"
    echo ""
else
    echo -e "${YELLOW}⚠${NC} ข้ามการ push"
    echo -e "${ARROW} รันคำสั่งนี้เมื่อพร้อม: ${CYAN}git push -u origin main${NC}"
fi
