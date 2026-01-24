# คู่มือการ Deploy Inbox System

## ขั้นตอนการ Deploy บน Production Server

### 1. เตรียม Server

```bash
# ติดตั้ง Node.js 18+ และ npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# ติดตั้ง MySQL
sudo apt-get install mysql-server

# ติดตั้ง PM2 สำหรับรัน Node.js
sudo npm install -g pm2
```

### 2. สร้างฐานข้อมูล MySQL

```sql
CREATE DATABASE pharmacy_inbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'inbox_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON pharmacy_inbox.* TO 'inbox_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Clone และติดตั้ง Dependencies

```bash
# Clone project
cd /var/www
git clone <your-repo-url> inbox-nextjs
cd inbox-nextjs

# ติดตั้ง dependencies
npm install

# คัดลอกและแก้ไข environment variables
cp .env.production .env.local
nano .env.local
```

### 4. ตั้งค่า Environment Variables

แก้ไขไฟล์ `.env.local`:

```env
DATABASE_URL="mysql://inbox_user:secure_password@localhost:3306/pharmacy_inbox"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
LINE_CHANNEL_ACCESS_TOKEN="your-line-token"
LINE_CHANNEL_SECRET="your-line-secret"
NODE_ENV="production"
```

### 5. Migration ข้อมูลจากระบบเดิม

```bash
# ตั้งค่า environment สำหรับ PHP database
export PHP_DB_HOST="localhost"
export PHP_DB_USER="root"
export PHP_DB_PASSWORD="your_password"
export PHP_DB_NAME="pharmacy_crm"

# รัน migration script
npm run db:push
npx tsx scripts/migrate-from-php.ts
```

### 6. Build และ Deploy

```bash
# Build production
npm run build

# Start with PM2
pm2 start npm --name "inbox-nextjs" -- start
pm2 save
pm2 startup
```

### 7. ตั้งค่า Nginx Reverse Proxy

สร้างไฟล์ `/etc/nginx/sites-available/inbox`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/inbox /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ติดตั้ง SSL certificate
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 8. ตั้งค่า Webhook LINE

ไปที่ LINE Developers Console และตั้งค่า Webhook URL:

```
https://yourdomain.com/api/webhook
```

## การอัปเดตระบบ

```bash
cd /var/www/inbox-nextjs

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart
pm2 restart inbox-nextjs
```

## Monitoring

```bash
# ดู logs
pm2 logs inbox-nextjs

# ดู status
pm2 status

# ดู resource usage
pm2 monit
```

## Backup Database

```bash
# Backup script
mysqldump -u inbox_user -p pharmacy_inbox > backup_$(date +%Y%m%d).sql

# ตั้งค่า cron job สำหรับ backup อัตโนมัติ
0 2 * * * mysqldump -u inbox_user -p pharmacy_inbox > /backups/inbox_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### ปัญหา: Cannot connect to database
```bash
# ตรวจสอบ MySQL service
sudo systemctl status mysql

# ตรวจสอบ connection
mysql -u inbox_user -p pharmacy_inbox
```

### ปัญหา: Build failed
```bash
# ลบ cache และ rebuild
rm -rf .next node_modules
npm install
npm run build
```

### ปัญหา: PM2 not starting
```bash
# ตรวจสอบ logs
pm2 logs inbox-nextjs --lines 100

# Restart
pm2 delete inbox-nextjs
pm2 start npm --name "inbox-nextjs" -- start
```

## Performance Optimization

### 1. Enable Redis Caching

```bash
# ติดตั้ง Redis
sudo apt-get install redis-server

# เพิ่มใน .env.local
REDIS_URL="redis://localhost:6379"
```

### 2. Enable CDN สำหรับ Static Assets

ใช้ Cloudflare หรือ AWS CloudFront สำหรับ cache static files

### 3. Database Optimization

```sql
-- สร้าง indexes
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_line_users_interaction ON line_users(last_interaction DESC);
CREATE INDEX idx_messages_read ON messages(is_read, direction);
```

## Security Checklist

- [ ] เปลี่ยน NEXTAUTH_SECRET เป็นค่าที่ปลอดภัย
- [ ] ตั้งค่า firewall (ufw)
- [ ] Enable SSL/TLS certificate
- [ ] จำกัด database access เฉพาะ localhost
- [ ] ตั้งค่า rate limiting
- [ ] Enable security headers ใน Nginx
- [ ] สำรองข้อมูลสม่ำเสมอ
- [ ] Update dependencies เป็นประจำ
