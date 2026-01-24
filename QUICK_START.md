# คู่มือเริ่มต้นใช้งานด่วน

## สำหรับผู้ดูแลระบบ

### การติดตั้งครั้งแรก (บน Production Server)

#### 1. อัปโหลดไฟล์

```bash
# จาก local machine
cd inbox-nextjs
chmod +x deploy.sh

# แก้ไข deploy.sh ให้ตรงกับ server ของคุณ
nano deploy.sh
# แก้ไข REMOTE_USER, REMOTE_HOST

# อัปโหลด
./deploy.sh
```

หรือ **อัปโหลดด้วย FTP/SFTP**:
- อัปโหลดทั้งโฟลเดอร์ `inbox-nextjs` ไปที่ `/var/www/inbox-nextjs`

#### 2. ตั้งค่าบน Server

```bash
# SSH เข้า server
ssh your_username@your_server

# ไปที่ directory
cd /var/www/inbox-nextjs

# ติดตั้ง dependencies
npm install

# ตั้งค่า environment
cp .env.production .env.local
nano .env.local
```

**แก้ไขใน .env.local:**

```env
# ใช้ database เดียวกับระบบ PHP
DATABASE_URL="mysql://your_user:your_password@localhost:3306/pharmacy_crm"

# Domain จริง
NEXTAUTH_URL="https://yourdomain.com"

# Generate secret ใหม่
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

#### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema (จะเพิ่ม tables ใหม่เท่านั้น ไม่ลบของเดิม)
npm run db:push

# Seed admin user (ถ้าต้องการ)
npm run db:seed
```

#### 4. Build และ Start

```bash
# Build
npm run build

# Start with PM2
npm run pm2:start

# ตรวจสอบ
pm2 status
pm2 logs inbox-nextjs
```

#### 5. ตั้งค่า Nginx

```bash
# แก้ไข Nginx config
sudo nano /etc/nginx/sites-available/default
```

**เพิ่มใน config:**

```nginx
# Inbox Next.js
location /inbox {
    proxy_pass http://localhost:3000/inbox;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

location /api/inbox {
    proxy_pass http://localhost:3000/api/inbox;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location /api/auth {
    proxy_pass http://localhost:3000/api/auth;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location /_next/static {
    proxy_pass http://localhost:3000/_next/static;
    proxy_cache_valid 200 60m;
}
```

```bash
# Test และ reload
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. เพิ่มลิงก์ในระบบ PHP

แก้ไขเมนูในไฟล์ `includes/header.php` หรือ `includes/sidebar.php`:

```php
<!-- เพิ่มเมนู Inbox -->
<li class="<?php echo (strpos($_SERVER['REQUEST_URI'], '/inbox') !== false) ? 'active' : ''; ?>">
    <a href="/inbox">
        <i class="fa fa-inbox"></i>
        <span>Inbox</span>
        <?php if (isset($unread_count) && $unread_count > 0): ?>
            <span class="badge badge-danger"><?php echo $unread_count; ?></span>
        <?php endif; ?>
    </a>
</li>
```

#### 7. ทดสอบ

1. เปิด `https://yourdomain.com` - ระบบ PHP ควรทำงานปกติ
2. เปิด `https://yourdomain.com/inbox` - Inbox ใหม่ควรแสดง
3. Login ด้วย username/password จากระบบเดิม

---

## การอัปเดตระบบ

### วิธีที่ 1: ใช้ deploy script

```bash
# จาก local machine
cd inbox-nextjs
./deploy.sh
```

### วิธีที่ 2: อัปเดตด้วยตนเอง

```bash
# SSH เข้า server
ssh your_username@your_server
cd /var/www/inbox-nextjs

# Pull code ใหม่ (ถ้าใช้ git)
git pull origin main

# หรือ upload files ใหม่ด้วย FTP/SFTP

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart inbox-nextjs
```

---

## คำสั่งที่ใช้บ่อย

```bash
# ดู logs
pm2 logs inbox-nextjs

# Restart
pm2 restart inbox-nextjs

# Stop
pm2 stop inbox-nextjs

# Start
pm2 start inbox-nextjs

# ดู status
pm2 status

# ดู resource usage
pm2 monit
```

---

## การแก้ปัญหาเบื้องต้น

### ปัญหา: เข้า /inbox ไม่ได้ (404)

```bash
# ตรวจสอบว่า PM2 รันอยู่
pm2 status

# ตรวจสอบว่า Next.js ตอบสนอง
curl http://localhost:3000/inbox

# ตรวจสอบ Nginx config
sudo nginx -t

# Restart services
pm2 restart inbox-nextjs
sudo systemctl reload nginx
```

### ปัญหา: Login ไม่ได้

```bash
# ตรวจสอบ admin user
cd /var/www/inbox-nextjs
npm run test:auth

# ถ้า password ไม่ถูกต้อง จะ update ให้อัตโนมัติ
```

### ปัญหา: Database connection error

```bash
# ตรวจสอบ .env.local
cat .env.local

# ทดสอบ MySQL connection
mysql -u your_user -p pharmacy_crm

# ตรวจสอบ Prisma
npm run db:studio
```

### ปัญหา: ระบบ PHP ไม่ทำงาน

```bash
# ตรวจสอบ PHP-FPM
sudo systemctl status php8.1-fpm

# Restart
sudo systemctl restart php8.1-fpm
```

---

## ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย:
- ตรวจสอบ logs: `pm2 logs inbox-nextjs`
- ตรวจสอบ Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- ติดต่อทีมพัฒนา
