# 🧙‍♂️ Installation Wizard - คู่มือติดตั้งแบบละเอียดทีละขั้นตอน

> สำหรับผู้ที่ไม่เคยติดตั้ง Node.js หรือ Deploy แอปพลิเคชันมาก่อน

## 📋 สิ่งที่ต้องเตรียม

- [ ] Server Linux (Ubuntu 20.04+ แนะนำ) หรือ Windows Server
- [ ] ระบบ PHP ที่ทำงานอยู่แล้ว
- [ ] MySQL Database (ใช้อันเดียวกับระบบ PHP)
- [ ] ข้อมูล LINE Channel (Access Token, Secret)
- [ ] โปรแกรม SSH client (PuTTY สำหรับ Windows หรือ Terminal สำหรับ Mac/Linux)

---

## 🎯 เลือกวิธีติดตั้ง

### วิธีที่ 1: ติดตั้งอัตโนมัติ (แนะนำ) ⭐

ใช้ Installation Script ที่เตรียมไว้ให้ - ง่ายที่สุด!

```bash
# 1. อัปโหลดโฟลเดอร์ inbox-nextjs ไปที่ server
# 2. SSH เข้า server
# 3. รันคำสั่งเดียว
cd /path/to/inbox-nextjs
chmod +x install.sh
./install.sh
```

➡️ [ข้ามไปดูวิธีใช้ Install Script](#-วิธีที่-1-ใช้-installation-script-อัตโนมัติ)

### วิธีที่ 2: ติดตั้งด้วยตนเอง (ทีละขั้นตอน)

เหมาะสำหรับผู้ที่ต้องการเข้าใจทุกขั้นตอน

➡️ [ข้ามไปดูวิธีติดตั้งด้วยตนเอง](#-วิธีที่-2-ติดตั้งด้วยตนเองทีละขั้นตอน)

---

## 🚀 วิธีที่ 1: ใช้ Installation Script (อัตโนมัติ)

### ขั้นตอนที่ 1: อัปโหลดไฟล์ไปยัง Server

#### สำหรับ Windows (ใช้ WinSCP หรือ FileZilla):

1. ดาวน์โหลด [WinSCP](https://winscp.net/) (ฟรี)
2. เปิด WinSCP และกรอกข้อมูล:
   - **Host name**: IP ของ server
   - **User name**: username ของคุณ
   - **Password**: password ของคุณ
3. กด **Login**
4. ลากโฟลเดอร์ `inbox-nextjs` จากเครื่องของคุณไปยัง `/var/www/` บน server

#### สำหรับ Mac/Linux (ใช้ Terminal):

```bash
# จากเครื่องของคุณ
cd /path/to/your/files
scp -r inbox-nextjs username@your-server-ip:/home/your-user/public_html/cny.re-ya.com/
```

### ขั้นตอนที่ 2: เชื่อมต่อ SSH เข้า Server

#### สำหรับ Windows (ใช้ PuTTY):

1. ดาวน์โหลด [PuTTY](https://www.putty.org/) (ฟรี)
2. เปิด PuTTY
3. กรอก **Host Name**: IP ของ server
4. กด **Open**
5. Login ด้วย username และ password

#### สำหรับ Mac/Linux (ใช้ Terminal):

```bash
ssh username@your-server-ip
```

### ขั้นตอนที่ 3: รัน Installation Script

```bash
# ไปที่โฟลเดอร์ที่อัปโหลด
cd ~/public_html/cny.re-ya.com/inbox-nextjs

# ให้สิทธิ์รัน script
chmod +x install.sh

# รัน installation wizard
./install.sh
```

### ขั้นตอนที่ 4: ตอบคำถามจาก Wizard

Script จะถามคำถามต่อไปนี้:

```
1. Database Configuration
   - Database Host: [localhost]
   - Database Name: [pharmacy_crm]
   - Database User: [your_user]
   - Database Password: [your_password]

2. Domain Configuration
   - Your Domain: [yourdomain.com]

3. LINE Configuration
   - LINE Channel Access Token: [paste here]
   - LINE Channel Secret: [paste here]

4. Installation Options
   - Install Node.js? [Y/n]
   - Install PM2? [Y/n]
   - Configure Nginx? [Y/n]
   - Install SSL Certificate? [Y/n]
```

### ขั้นตอนที่ 5: รอการติดตั้งเสร็จสิ้น

Script จะทำงานอัตโนมัติ:
- ✅ ติดตั้ง Node.js
- ✅ ติดตั้ง dependencies
- ✅ Setup database
- ✅ Build application
- ✅ Configure PM2
- ✅ Setup Nginx
- ✅ (Optional) Install SSL

### ขั้นตอนที่ 6: ทดสอบระบบ

```bash
# ตรวจสอบว่า Next.js รันอยู่
pm2 status

# ควรเห็น:
# ┌─────┬──────────────┬─────────┬─────────┐
# │ id  │ name         │ status  │ restart │
# ├─────┼──────────────┼─────────┼─────────┤
# │ 0   │ inbox-nextjs │ online  │ 0       │
# └─────┴──────────────┴─────────┴─────────┘

# ทดสอบเปิดเบราว์เซอร์
https://yourdomain.com/inbox
```

🎉 **เสร็จแล้ว!** ข้ามไปที่ [การใช้งานครั้งแรก](#-การใช้งานครั้งแรก)

---

## 🔧 วิธีที่ 2: ติดตั้งด้วยตนเอง (ทีละขั้นตอน)

### ขั้นตอนที่ 1: ติดตั้ง Node.js

#### บน Ubuntu/Debian:

```bash
# อัปเดตระบบ
sudo apt update
sudo apt upgrade -y

# ติดตั้ง Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ตรวจสอบ version
node -v    # ควรแสดง v18.x.x
npm -v     # ควรแสดง 9.x.x
```

#### บน CentOS/RHEL:

```bash
# ติดตั้ง Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# ตรวจสอบ version
node -v
npm -v
```

#### บน Windows Server:

1. ดาวน์โหลด [Node.js Installer](https://nodejs.org/) (เลือก LTS version)
2. รัน installer และติดตั้งตามขั้นตอน
3. เปิด Command Prompt และตรวจสอบ: `node -v`

### ขั้นตอนที่ 2: ติดตั้ง PM2 (Process Manager)

```bash
# ติดตั้ง PM2 แบบ global
sudo npm install -g pm2

# ตรวจสอบ
pm2 -v

# ตั้งค่าให้ PM2 เริ่มทำงานอัตโนมัติเมื่อ server restart
pm2 startup
# จะแสดงคำสั่งให้รัน ให้ copy และรันคำสั่งนั้น
```

### ขั้นตอนที่ 3: อัปโหลดและติดตั้ง Application

```bash
# ไปที่ directory ที่อัปโหลดไว้
cd ~/public_html/cny.re-ya.com/inbox-nextjs

# ติดตั้ง dependencies
npm install

# ใช้เวลาประมาณ 2-5 นาที
# จะเห็น progress bar และ package names
```

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

```bash
# สร้างไฟล์ .env.local
cp .env.production .env.local

# แก้ไขไฟล์
nano .env.local
```

**กรอกข้อมูลตามจริง:**

```env
# Database - ใช้ข้อมูลเดียวกับระบบ PHP
DATABASE_URL="mysql://your_user:your_password@localhost:3306/pharmacy_crm"

# Domain
NEXTAUTH_URL="https://yourdomain.com"

# Generate secret (รันคำสั่งนี้แล้ว copy ผลลัพธ์มาใส่)
# openssl rand -base64 32
NEXTAUTH_SECRET="paste-generated-secret-here"

# LINE API (ดูจากระบบ PHP เดิม หรือจาก LINE Developers Console)
LINE_CHANNEL_ACCESS_TOKEN="your-line-channel-access-token"
LINE_CHANNEL_SECRET="your-line-channel-secret"
```

**บันทึกไฟล์:**
- กด `Ctrl + X`
- กด `Y`
- กด `Enter`

### ขั้นตอนที่ 5: Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push database schema (สร้าง tables ใหม่)
npm run db:push

# ถ้าถาม "Are you sure?" พิมพ์: yes

# (Optional) Seed ข้อมูลทดสอบ
npm run db:seed
```

### ขั้นตอนที่ 6: Build Application

```bash
# Build for production
npm run build

# ใช้เวลาประมาณ 2-5 นาที
# ถ้าสำเร็จจะเห็น:
# ✓ Compiled successfully
```

### ขั้นตอนที่ 7: Start Application ด้วย PM2

```bash
# Start with PM2
pm2 start ecosystem.config.js

# ตรวจสอบ status
pm2 status

# ดู logs
pm2 logs inbox-nextjs

# บันทึก configuration
pm2 save
```

### ขั้นตอนที่ 8: ตั้งค่า Nginx

```bash
# Backup config เดิม
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# แก้ไข config
sudo nano /etc/nginx/sites-available/default
```

**เพิ่ม configuration นี้ใน server block:**

```nginx
# เพิ่มก่อน location / {
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
```

**บันทึกและ reload Nginx:**

```bash
# Test configuration
sudo nginx -t

# ถ้าแสดง "syntax is ok" และ "test is successful"
sudo systemctl reload nginx
```

### ขั้นตอนที่ 9: (Optional) ติดตั้ง SSL Certificate

```bash
# ติดตั้ง Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# ตอบคำถาม:
# - Email: your-email@example.com
# - Agree to Terms: Y
# - Redirect HTTP to HTTPS: 2 (Yes)
```

---

## 🎉 การใช้งานครั้งแรก

### 1. ทดสอบระบบ PHP เดิม

เปิดเบราว์เซอร์:
```
https://yourdomain.com
```

ระบบ PHP ควรทำงานปกติเหมือนเดิม ✅

### 2. ทดสอบ Inbox ใหม่

เปิดเบราว์เซอร์:
```
https://yourdomain.com/inbox
```

ควรเห็นหน้า Login ของ Inbox ✅

### 3. Login เข้าระบบ

**ถ้ารัน seed script:**
- Username: `admin`
- Password: `password123`

**ถ้าไม่ได้รัน seed:**
- ใช้ username/password จากระบบ PHP เดิม
- หรือรัน: `npm run test:auth` เพื่อสร้าง admin user

### 4. เพิ่มลิงก์ใน PHP System

แก้ไขเมนูในระบบ PHP (เช่น `includes/header.php`):

```php
<!-- เพิ่มเมนู Inbox -->
<li>
    <a href="/inbox">
        <i class="fa fa-inbox"></i>
        <span>Inbox</span>
    </a>
</li>
```

---

## 🔍 การตรวจสอบและแก้ปัญหา

### ตรวจสอบว่า Next.js ทำงานหรือไม่

```bash
# ดู status
pm2 status

# ดู logs
pm2 logs inbox-nextjs --lines 50

# ทดสอบ curl
curl http://localhost:3000/inbox
```

### ตรวจสอบว่า Nginx ทำงานหรือไม่

```bash
# ดู status
sudo systemctl status nginx

# ทดสอบ config
sudo nginx -t

# ดู error logs
sudo tail -f /var/log/nginx/error.log
```

### ตรวจสอบ Database Connection

```bash
cd /var/www/inbox-nextjs

# ทดสอบ connection
npm run db:studio

# จะเปิด Prisma Studio ที่ http://localhost:5555
# ถ้าเปิดได้ แสดงว่า database connection ถูกต้อง
```

---

## ❌ แก้ไขปัญหาที่พบบ่อย

### ปัญหา 1: "command not found: node"

**สาเหตุ:** ยังไม่ได้ติดตั้ง Node.js

**แก้ไข:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### ปัญหา 2: "Cannot connect to database"

**สาเหตุ:** DATABASE_URL ไม่ถูกต้อง

**แก้ไข:**
```bash
# ตรวจสอบ .env.local
cat /var/www/inbox-nextjs/.env.local

# ทดสอบ MySQL connection
mysql -u your_user -p pharmacy_crm
# ถ้าเข้าได้ แสดงว่า user/password ถูกต้อง

# แก้ไข DATABASE_URL ให้ตรง
nano /var/www/inbox-nextjs/.env.local
```

### ปัญหา 3: "502 Bad Gateway"

**สาเหตุ:** Next.js ไม่ได้รันหรือ Nginx config ผิด

**แก้ไข:**
```bash
# ตรวจสอบ Next.js
pm2 status
pm2 logs inbox-nextjs

# ถ้า status ไม่ใช่ "online"
pm2 restart inbox-nextjs

# ตรวจสอบ Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### ปัญหา 4: "Permission denied"

**สาเหตุ:** ไม่มีสิทธิ์เข้าถึงไฟล์

**แก้ไข:**
```bash
# ให้สิทธิ์ที่ถูกต้อง
sudo chown -R $USER:$USER /var/www/inbox-nextjs
chmod -R 755 /var/www/inbox-nextjs
```

### ปัญหา 5: "Port 3000 already in use"

**สาเหตุ:** มีโปรแกรมอื่นใช้ port 3000 อยู่

**แก้ไข:**
```bash
# หา process ที่ใช้ port 3000
sudo lsof -i :3000

# Kill process นั้น
sudo kill -9 <PID>

# หรือเปลี่ยน port ใน .env.local
nano /var/www/inbox-nextjs/.env.local
# เพิ่ม: PORT=3001
```

---

## 📞 ต้องการความช่วยเหลือ?

### ดู Logs

```bash
# Next.js logs
pm2 logs inbox-nextjs

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -xe
```

### รัน Health Check

```bash
cd /var/www/inbox-nextjs

# ตรวจสอบทุกอย่าง
./health-check.sh
```

### ติดต่อทีมพัฒนา

หากยังแก้ไขไม่ได้:
1. เก็บ logs: `pm2 logs inbox-nextjs > logs.txt`
2. Screenshot หน้าจอ error
3. ส่งให้ทีมพัฒนา

---

## 🎓 คำศัพท์ที่ควรรู้

- **Node.js**: ตัวรัน JavaScript บน server
- **npm**: ตัวจัดการ package สำหรับ Node.js
- **PM2**: ตัวจัดการ process ทำให้แอปรันตลอดเวลา
- **Nginx**: Web server ที่ทำหน้าที่เป็นตัวกลาง
- **Prisma**: ORM สำหรับจัดการ database
- **SSL**: ใบรับรอง HTTPS ทำให้เว็บปลอดภัย

---

## ✅ Checklist สำหรับการติดตั้ง

- [ ] ติดตั้ง Node.js สำเร็จ
- [ ] ติดตั้ง PM2 สำเร็จ
- [ ] อัปโหลดไฟล์ไปยัง server แล้ว
- [ ] ตั้งค่า .env.local แล้ว
- [ ] รัน npm install สำเร็จ
- [ ] รัน db:push สำเร็จ
- [ ] Build application สำเร็จ
- [ ] Start PM2 สำเร็จ
- [ ] ตั้งค่า Nginx แล้ว
- [ ] ทดสอบเข้า /inbox ได้แล้ว
- [ ] Login เข้าระบบได้แล้ว
- [ ] ระบบ PHP เดิมยังทำงานปกติ

🎉 **ยินดีด้วย! คุณติดตั้งสำเร็จแล้ว**
