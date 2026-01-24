# คู่มือการติดตั้ง Inbox Next.js ร่วมกับระบบ PHP เดิม

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────┐
│           Nginx Reverse Proxy               │
│         (yourdomain.com:80/443)            │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│  PHP System  │    │  Next.js Inbox   │
│  (Port 80)   │    │  (Port 3000)     │
│              │    │                  │
│ - Admin      │    │ - /inbox         │
│ - User       │    │ - /api/inbox     │
│ - Shop       │    │ - /api/auth      │
│ - Analytics  │    │                  │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       └──────────┬──────────┘
                  ▼
         ┌─────────────────┐
         │  MySQL Database │
         │  (shared)       │
         └─────────────────┘
```

## ขั้นตอนการติดตั้ง

### 1. เตรียม Server (ถ้ายังไม่มี)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2

# ตรวจสอบว่ามี PHP และ MySQL อยู่แล้ว
php -v
mysql --version
```

### 2. Clone และติดตั้ง Next.js Inbox

```bash
# ไปที่ directory หลัก
cd /var/www

# Clone project (หรือ upload files)
git clone <your-repo> inbox-nextjs
# หรือ
mkdir inbox-nextjs
# แล้ว upload files ไปที่ /var/www/inbox-nextjs

cd inbox-nextjs

# ติดตั้ง dependencies
npm install
```

### 3. ตั้งค่า Environment Variables

```bash
# สร้างไฟล์ .env.local
cp .env.production .env.local

# แก้ไขค่าต่างๆ
nano .env.local
```

**สิ่งสำคัญที่ต้องแก้ไข:**

```env
# ใช้ database เดียวกับระบบ PHP
DATABASE_URL="mysql://your_user:your_password@localhost:3306/pharmacy_crm"

# ใช้ domain จริง
NEXTAUTH_URL="https://yourdomain.com"

# Generate secret ใหม่
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# ใช้ LINE credentials เดียวกับระบบ PHP (ดูจาก config.php)
LINE_CHANNEL_ACCESS_TOKEN="copy_from_php_config"
LINE_CHANNEL_SECRET="copy_from_php_config"
```

### 4. Setup Database Schema

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (จะสร้าง tables ใหม่เฉพาะที่ยังไม่มี)
npm run db:push

# ⚠️ สำคัญ: ตรวจสอบว่าไม่ได้ลบ tables เดิม
# Prisma จะเพิ่มเฉพาะ tables ที่ยังไม่มีเท่านั้น
```

### 5. Migration ข้อมูลจากระบบเดิม (ถ้าต้องการ)

```bash
# ตั้งค่า environment สำหรับ migration
export PHP_DB_HOST="localhost"
export PHP_DB_USER="your_db_user"
export PHP_DB_PASSWORD="your_db_password"
export PHP_DB_NAME="pharmacy_crm"

# รัน migration script
npm run migrate:from-php
```

**หมายเหตุ:** Script จะ:
- ไม่ลบข้อมูลเดิม
- ใช้ `upsert` เพื่ออัปเดตข้อมูลที่มีอยู่แล้ว
- คัดลอกข้อมูลที่จำเป็นสำหรับ Inbox เท่านั้น

### 6. Build Next.js

```bash
# Build for production
npm run build

# ทดสอบรันก่อน
npm start

# ถ้าทำงานได้ปกติ กด Ctrl+C แล้วไปขั้นตอนถัดไป
```

### 7. ตั้งค่า PM2

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# แล้วรัน command ที่มันแสดงให้

# ตรวจสอบ status
pm2 status
pm2 logs inbox-nextjs
```

### 8. ตั้งค่า Nginx

```bash
# Backup config เดิม
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# สร้าง config ใหม่
sudo nano /etc/nginx/sites-available/pharmacy-system
```

**วาง config นี้:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # ระบบ PHP หลัก
    root /var/www/html;
    index index.php index.html;

    # Logs
    access_log /var/log/nginx/pharmacy_access.log;
    error_log /var/log/nginx/pharmacy_error.log;

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Next.js Inbox - Reverse Proxy
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Inbox API routes
    location /api/inbox {
        proxy_pass http://localhost:3000/api/inbox;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # NextAuth API
    location /api/auth {
        proxy_pass http://localhost:3000/api/auth;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://localhost:3000/_next/image;
        proxy_set_header Host $host;
    }

    # PHP system - default
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pharmacy-system /etc/nginx/sites-enabled/

# ปิด default site (ถ้ามี)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 9. ติดตั้ง SSL Certificate

```bash
# ติดตั้ง Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Certbot จะแก้ไข Nginx config ให้อัตโนมัติ
# และเพิ่ม HTTPS redirect
```

### 10. เพิ่มลิงก์ใน PHP System

แก้ไขเมนูในระบบ PHP เดิม (เช่น `includes/header.php`):

```php
<!-- เพิ่มเมนู Inbox -->
<li>
    <a href="/inbox">
        <i class="fa fa-inbox"></i>
        <span>Inbox</span>
    </a>
</li>
```

## การทดสอบ

### 1. ทดสอบระบบ PHP เดิม

```bash
# เปิดเบราว์เซอร์
https://yourdomain.com/admin
https://yourdomain.com/user/dashboard.php

# ควรทำงานได้ปกติเหมือนเดิม
```

### 2. ทดสอบ Inbox ใหม่

```bash
# เปิดเบราว์เซอร์
https://yourdomain.com/inbox

# Login ด้วย:
Username: admin
Password: password123
```

### 3. ทดสอบการเชื่อมต่อ Database

```bash
# ตรวจสอบว่า tables ถูกสร้าง
mysql -u your_user -p pharmacy_crm

mysql> SHOW TABLES;
# ควรเห็น tables เดิม + tables ใหม่จาก Prisma

mysql> SELECT * FROM admin_users LIMIT 1;
# ควรเห็นข้อมูล admin
```

## การอัปเดตระบบ

### อัปเดต PHP System (เหมือนเดิม)

```bash
cd /var/www/html
git pull origin main
# หรือ upload files ใหม่
```

### อัปเดต Next.js Inbox

```bash
cd /var/www/inbox-nextjs

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations (ถ้ามี)
npm run db:push

# Rebuild
npm run build

# Restart PM2
pm2 restart inbox-nextjs

# ตรวจสอบ logs
pm2 logs inbox-nextjs
```

## Monitoring

```bash
# ดู logs ของ Next.js
pm2 logs inbox-nextjs

# ดู logs ของ Nginx
sudo tail -f /var/log/nginx/pharmacy_error.log
sudo tail -f /var/log/nginx/pharmacy_access.log

# ดู resource usage
pm2 monit

# ดู status
pm2 status
systemctl status nginx
systemctl status mysql
```

## Troubleshooting

### ปัญหา: Inbox ไม่แสดง

```bash
# ตรวจสอบว่า Next.js รันอยู่
pm2 status

# ตรวจสอบ port 3000
netstat -tulpn | grep 3000

# ตรวจสอบ logs
pm2 logs inbox-nextjs --lines 100
```

### ปัญหา: Database connection error

```bash
# ตรวจสอบ .env.local
cat /var/www/inbox-nextjs/.env.local

# ทดสอบ connection
mysql -u your_user -p pharmacy_crm
```

### ปัญหา: 502 Bad Gateway

```bash
# ตรวจสอบ Nginx config
sudo nginx -t

# ตรวจสอบว่า Next.js รันอยู่
curl http://localhost:3000/inbox

# Restart services
pm2 restart inbox-nextjs
sudo systemctl reload nginx
```

### ปัญหา: PHP system ไม่ทำงาน

```bash
# ตรวจสอบ PHP-FPM
sudo systemctl status php8.1-fpm

# Restart PHP-FPM
sudo systemctl restart php8.1-fpm

# ตรวจสอบ Nginx config
sudo nginx -t
```

## Security Checklist

- [ ] เปลี่ยน `NEXTAUTH_SECRET` เป็นค่าที่ปลอดภัย
- [ ] ติดตั้ง SSL certificate
- [ ] ตั้งค่า firewall (ufw)
- [ ] จำกัด database access
- [ ] Enable security headers ใน Nginx
- [ ] Backup database สม่ำเสมอ
- [ ] Update dependencies เป็นประจำ
- [ ] Monitor logs เป็นประจำ

## Performance Tips

1. **Enable Redis Caching**
   ```bash
   sudo apt-get install redis-server
   # เพิ่ม REDIS_URL ใน .env.local
   ```

2. **Database Optimization**
   ```sql
   -- สร้าง indexes
   CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
   CREATE INDEX idx_line_users_interaction ON line_users(last_interaction DESC);
   ```

3. **Nginx Caching**
   - Static files จาก Next.js จะถูก cache อัตโนมัติ
   - ตั้งค่า cache headers ใน Nginx config

## Backup Strategy

```bash
# สำรองระบบ PHP
tar -czf php-backup-$(date +%Y%m%d).tar.gz /var/www/html

# สำรอง Next.js
tar -czf nextjs-backup-$(date +%Y%m%d).tar.gz /var/www/inbox-nextjs

# สำรอง Database
mysqldump -u your_user -p pharmacy_crm > db-backup-$(date +%Y%m%d).sql

# ตั้งค่า cron job
0 2 * * * /path/to/backup-script.sh
```
