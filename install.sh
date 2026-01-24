#!/bin/bash

# =============================================================================
# LINE CRM Pharmacy Inbox - Installation Wizard
# =============================================================================
# Interactive installation script for users who never deployed Node.js before
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Unicode symbols
CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
ARROW="${BLUE}➜${NC}"
STAR="${YELLOW}★${NC}"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}  ${CYAN}LINE CRM Pharmacy Inbox - Installation Wizard${NC}     ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${STAR} ${YELLOW}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${CHECK_MARK} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${CROSS_MARK} ${RED}$1${NC}"
}

print_info() {
    echo -e "${ARROW} ${CYAN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  ${YELLOW}$1${NC}"
}

ask_question() {
    local question=$1
    local default=$2
    local var_name=$3
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${CYAN}$question ${NC}[${GREEN}$default${NC}]: )" answer
        answer=${answer:-$default}
    else
        read -p "$(echo -e ${CYAN}$question: ${NC})" answer
    fi
    
    eval $var_name="'$answer'"
}

ask_yes_no() {
    local question=$1
    local default=$2
    
    if [ "$default" = "Y" ]; then
        read -p "$(echo -e ${CYAN}$question ${NC}[${GREEN}Y${NC}/n]: )" answer
        answer=${answer:-Y}
    else
        read -p "$(echo -e ${CYAN}$question ${NC}[y/${GREEN}N${NC}]: )" answer
        answer=${answer:-N}
    fi
    
    [[ "$answer" =~ ^[Yy]$ ]]
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_warning "$1 is not installed"
        return 1
    fi
}

# =============================================================================
# Main Installation Functions
# =============================================================================

check_prerequisites() {
    print_step "ขั้นตอนที่ 1: ตรวจสอบระบบ"
    
    print_info "กำลังตรวจสอบระบบปฏิบัติการ..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_success "ระบบปฏิบัติการ: Linux"
        OS_TYPE="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "ระบบปฏิบัติการ: macOS"
        OS_TYPE="mac"
    else
        print_error "ระบบปฏิบัติการนี้ไม่รองรับ auto-installation"
        print_info "กรุณาติดตั้งด้วยตนเองตาม INSTALLATION_WIZARD.md"
        exit 1
    fi
    
    echo ""
    print_info "กำลังตรวจสอบโปรแกรมที่จำเป็น..."
    
    # Check for required commands
    NEED_INSTALL=()
    
    if ! check_command "curl"; then
        NEED_INSTALL+=("curl")
    fi
    
    if ! check_command "git"; then
        NEED_INSTALL+=("git")
    fi
    
    if ! check_command "mysql"; then
        print_warning "MySQL client ไม่พบ (แต่อาจติดตั้งอยู่แล้ว)"
    fi
    
    if [ ${#NEED_INSTALL[@]} -gt 0 ]; then
        echo ""
        print_warning "ต้องติดตั้งโปรแกรมเหล่านี้: ${NEED_INSTALL[*]}"
        
        if ask_yes_no "ต้องการให้ติดตั้งอัตโนมัติหรือไม่?" "Y"; then
            install_prerequisites
        else
            print_error "กรุณาติดตั้งโปรแกรมที่จำเป็นก่อน แล้วรัน script นี้อีกครั้ง"
            exit 1
        fi
    fi
}

install_prerequisites() {
    print_info "กำลังติดตั้งโปรแกรมที่จำเป็น..."
    
    if [ "$OS_TYPE" = "linux" ]; then
        sudo apt-get update
        sudo apt-get install -y curl git
    elif [ "$OS_TYPE" = "mac" ]; then
        brew install curl git
    fi
    
    print_success "ติดตั้งโปรแกรมที่จำเป็นเสร็จสิ้น"
}

install_nodejs() {
    print_step "ขั้นตอนที่ 2: ติดตั้ง Node.js"
    
    if check_command "node"; then
        NODE_VERSION=$(node -v)
        print_success "Node.js version: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js version เหมาะสม (>= 18)"
            return 0
        else
            print_warning "Node.js version ต่ำเกินไป (ต้องการ >= 18)"
        fi
    fi
    
    echo ""
    if ask_yes_no "ต้องการติดตั้ง Node.js 18.x หรือไม่?" "Y"; then
        print_info "กำลังติดตั้ง Node.js 18.x..."
        
        if [ "$OS_TYPE" = "linux" ]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [ "$OS_TYPE" = "mac" ]; then
            brew install node@18
        fi
        
        print_success "ติดตั้ง Node.js เสร็จสิ้น"
        print_info "Node.js version: $(node -v)"
        print_info "npm version: $(npm -v)"
    else
        print_error "ต้องการ Node.js 18.x ขึ้นไป กรุณาติดตั้งด้วยตนเอง"
        exit 1
    fi
}

install_pm2() {
    print_step "ขั้นตอนที่ 3: ติดตั้ง PM2 (Process Manager)"
    
    if check_command "pm2"; then
        print_success "PM2 ติดตั้งอยู่แล้ว"
        return 0
    fi
    
    echo ""
    if ask_yes_no "ต้องการติดตั้ง PM2 หรือไม่?" "Y"; then
        print_info "กำลังติดตั้ง PM2..."
        sudo npm install -g pm2
        print_success "ติดตั้ง PM2 เสร็จสิ้น"
        
        print_info "กำลังตั้งค่า PM2 startup..."
        pm2 startup | tail -n 1 | sudo bash
        print_success "ตั้งค่า PM2 startup เสร็จสิ้น"
    else
        print_warning "ข้ามการติดตั้ง PM2 (แต่แนะนำให้ติดตั้ง)"
    fi
}

collect_configuration() {
    print_step "ขั้นตอนที่ 4: กรอกข้อมูลการตั้งค่า"
    
    print_info "กรุณากรอกข้อมูลต่อไปนี้ (กด Enter เพื่อใช้ค่า default)"
    echo ""
    
    # Database Configuration
    echo -e "${YELLOW}📊 Database Configuration${NC}"
    ask_question "Database Host" "localhost" DB_HOST
    ask_question "Database Name" "pharmacy_crm" DB_NAME
    ask_question "Database User" "root" DB_USER
    ask_question "Database Password (จะไม่แสดงบนหน้าจอ)" "" DB_PASS
    
    echo ""
    
    # Domain Configuration
    echo -e "${YELLOW}🌐 Domain Configuration${NC}"
    ask_question "Your Domain (เช่น example.com)" "" DOMAIN
    
    echo ""
    
    # LINE Configuration
    echo -e "${YELLOW}💬 LINE Configuration${NC}"
    print_info "ดูข้อมูลได้จาก: https://developers.line.biz/console/"
    ask_question "LINE Channel Access Token" "" LINE_TOKEN
    ask_question "LINE Channel Secret" "" LINE_SECRET
    
    echo ""
    
    # Generate NEXTAUTH_SECRET
    print_info "กำลัง generate NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    print_success "Generated: ${NEXTAUTH_SECRET:0:20}..."
    
    echo ""
    print_info "กำลังสร้างไฟล์ .env.local..."
    
    cat > .env.local << EOF
# Auto-generated by installation wizard
# Generated at: $(date)

# Database
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:3306/${DB_NAME}"

# NextAuth
NEXTAUTH_URL="https://${DOMAIN}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# LINE API
LINE_CHANNEL_ACCESS_TOKEN="${LINE_TOKEN}"
LINE_CHANNEL_SECRET="${LINE_SECRET}"

# Node Environment
NODE_ENV="production"
PORT="3000"
EOF
    
    print_success "สร้างไฟล์ .env.local เสร็จสิ้น"
}

install_dependencies() {
    print_step "ขั้นตอนที่ 5: ติดตั้ง Dependencies"
    
    print_info "กำลังติดตั้ง npm packages..."
    print_warning "ขั้นตอนนี้อาจใช้เวลา 2-5 นาที กรุณารอ..."
    
    npm install --production
    
    print_success "ติดตั้ง dependencies เสร็จสิ้น"
}

setup_database() {
    print_step "ขั้นตอนที่ 6: Setup Database"
    
    print_info "กำลัง generate Prisma Client..."
    npm run db:generate
    print_success "Generate Prisma Client เสร็จสิ้น"
    
    echo ""
    print_info "กำลัง push database schema..."
    print_warning "จะสร้าง tables ใหม่ใน database (ไม่ลบข้อมูลเดิม)"
    
    npm run db:push -- --accept-data-loss
    print_success "Push database schema เสร็จสิ้น"
    
    echo ""
    if ask_yes_no "ต้องการ seed ข้อมูลทดสอบหรือไม่? (สร้าง admin user)" "Y"; then
        print_info "กำลัง seed database..."
        npm run db:seed
        print_success "Seed database เสร็จสิ้น"
        echo ""
        print_info "Admin Login:"
        print_info "  Username: admin"
        print_info "  Password: password123"
    fi
}

build_application() {
    print_step "ขั้นตอนที่ 7: Build Application"
    
    print_info "กำลัง build Next.js application..."
    print_warning "ขั้นตอนนี้อาจใช้เวลา 2-5 นาที กรุณารอ..."
    
    npm run build
    
    print_success "Build application เสร็จสิ้น"
}

start_application() {
    print_step "ขั้นตอนที่ 8: Start Application"
    
    if check_command "pm2"; then
        print_info "กำลัง start application ด้วย PM2..."
        
        # Stop if already running
        pm2 stop inbox-nextjs 2>/dev/null || true
        pm2 delete inbox-nextjs 2>/dev/null || true
        
        # Start
        pm2 start ecosystem.config.js
        pm2 save
        
        print_success "Start application เสร็จสิ้น"
        
        echo ""
        print_info "PM2 Status:"
        pm2 status
    else
        print_warning "PM2 ไม่ได้ติดตั้ง จะรัน application แบบ standalone"
        print_info "กำลัง start application..."
        npm start &
        print_success "Application กำลังรันอยู่"
    fi
}

configure_nginx() {
    print_step "ขั้นตอนที่ 9: Configure Nginx (Optional)"
    
    if ! check_command "nginx"; then
        print_warning "Nginx ไม่ได้ติดตั้ง"
        print_info "หากต้องการใช้ Nginx กรุณาติดตั้งด้วยตนเอง"
        return 0
    fi
    
    echo ""
    if ask_yes_no "ต้องการตั้งค่า Nginx อัตโนมัติหรือไม่?" "Y"; then
        print_info "กำลังสร้าง Nginx configuration..."
        
        NGINX_CONF="/etc/nginx/sites-available/inbox-nextjs"
        
        sudo tee $NGINX_CONF > /dev/null << 'EOF'
# Inbox Next.js Configuration
location /inbox {
    proxy_pass http://localhost:3000/inbox;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/inbox {
    proxy_pass http://localhost:3000/api/inbox;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/auth {
    proxy_pass http://localhost:3000/api/auth;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /_next/static {
    proxy_pass http://localhost:3000/_next/static;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, max-age=3600";
}
EOF
        
        print_success "สร้าง Nginx configuration เสร็จสิ้น"
        
        echo ""
        print_warning "กรุณาเพิ่ม configuration นี้ใน Nginx config ของคุณ:"
        print_info "ไฟล์: $NGINX_CONF"
        print_info "หรือ copy เนื้อหาไปใส่ใน /etc/nginx/sites-available/default"
        
        echo ""
        print_info "หลังจากแก้ไข Nginx config แล้ว รันคำสั่ง:"
        echo -e "  ${CYAN}sudo nginx -t${NC}"
        echo -e "  ${CYAN}sudo systemctl reload nginx${NC}"
    else
        print_info "ข้ามการตั้งค่า Nginx"
        print_info "กรุณาตั้งค่าด้วยตนเองตาม HYBRID_DEPLOYMENT.md"
    fi
}

install_ssl() {
    print_step "ขั้นตอนที่ 10: Install SSL Certificate (Optional)"
    
    if ! check_command "certbot"; then
        print_warning "Certbot ไม่ได้ติดตั้ง"
        
        if ask_yes_no "ต้องการติดตั้ง Certbot หรือไม่?" "N"; then
            print_info "กำลังติดตั้ง Certbot..."
            sudo apt-get install -y certbot python3-certbot-nginx
            print_success "ติดตั้ง Certbot เสร็จสิ้น"
        else
            print_info "ข้ามการติดตั้ง SSL"
            return 0
        fi
    fi
    
    echo ""
    if ask_yes_no "ต้องการติดตั้ง SSL certificate สำหรับ ${DOMAIN} หรือไม่?" "N"; then
        print_info "กำลังติดตั้ง SSL certificate..."
        print_warning "กรุณาตอบคำถามจาก Certbot"
        
        sudo certbot --nginx -d $DOMAIN
        
        print_success "ติดตั้ง SSL certificate เสร็จสิ้น"
    else
        print_info "ข้ามการติดตั้ง SSL"
    fi
}

print_summary() {
    print_step "🎉 การติดตั้งเสร็จสิ้น!"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ${CYAN}Installation Summary${NC}                                  ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    print_success "Application URL: https://${DOMAIN}/inbox"
    print_success "Admin Login: admin / password123 (ถ้ารัน seed)"
    
    echo ""
    echo -e "${YELLOW}📝 ขั้นตอนถัดไป:${NC}"
    echo ""
    echo "  1. ตรวจสอบว่า application รันอยู่:"
    echo -e "     ${CYAN}pm2 status${NC}"
    echo ""
    echo "  2. ดู logs:"
    echo -e "     ${CYAN}pm2 logs inbox-nextjs${NC}"
    echo ""
    echo "  3. เปิดเบราว์เซอร์:"
    echo -e "     ${CYAN}https://${DOMAIN}/inbox${NC}"
    echo ""
    echo "  4. เพิ่มลิงก์ใน PHP system:"
    echo -e "     ${CYAN}แก้ไข includes/header.php${NC}"
    echo -e "     ${CYAN}เพิ่ม: <a href=\"/inbox\">Inbox</a>${NC}"
    echo ""
    
    echo -e "${YELLOW}📚 เอกสารเพิ่มเติม:${NC}"
    echo "  - INSTALLATION_WIZARD.md - คู่มือติดตั้งแบบละเอียด"
    echo "  - HYBRID_DEPLOYMENT.md - คู่มือ deployment"
    echo "  - INTEGRATION.md - วิธีเชื่อมต่อกับ PHP"
    echo ""
    
    echo -e "${YELLOW}🔧 คำสั่งที่ใช้บ่อย:${NC}"
    echo "  pm2 status              - ดู status"
    echo "  pm2 logs inbox-nextjs   - ดู logs"
    echo "  pm2 restart inbox-nextjs - restart application"
    echo "  pm2 stop inbox-nextjs   - stop application"
    echo ""
    
    print_success "ติดตั้งเสร็จสมบูรณ์! 🎉"
}

# =============================================================================
# Main Installation Flow
# =============================================================================

main() {
    clear
    print_header
    
    print_info "ยินดีต้อนรับสู่ Installation Wizard!"
    print_info "Script นี้จะช่วยติดตั้ง Inbox Next.js ให้คุณอัตโนมัติ"
    echo ""
    
    if ! ask_yes_no "พร้อมที่จะเริ่มติดตั้งหรือไม่?" "Y"; then
        print_info "ยกเลิกการติดตั้ง"
        exit 0
    fi
    
    # Run installation steps
    check_prerequisites
    install_nodejs
    install_pm2
    collect_configuration
    install_dependencies
    setup_database
    build_application
    start_application
    configure_nginx
    install_ssl
    print_summary
    
    echo ""
    print_success "ขอบคุณที่ใช้ LINE CRM Pharmacy Inbox System!"
    echo ""
}

# Run main function
main "$@"
