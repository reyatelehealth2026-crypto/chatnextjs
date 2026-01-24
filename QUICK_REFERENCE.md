# 📖 Quick Reference Card - คู่มือใช้งานด่วน

## 🚀 การติดตั้งครั้งแรก

```bash
# 1. อัปโหลดไฟล์ไปยัง /var/www/inbox-nextjs

# 2. SSH เข้า server
ssh username@your-server

# 3. รัน installation wizard
cd /var/www/inbox-nextjs
chmod +x install.sh
./install.sh

# 4. ตอบคำถามตาม wizard
# 5. เสร็จแล้ว! เปิด https://yourdomain.com/inbox
```

---

## 🔧 คำสั่งที่ใช้บ่อย

### PM2 Commands

```bash
# ดู status
pm2 status

# ดู logs (real-time)
pm2 logs inbox-nextjs

# ดู logs (แสดง 100 บรรทัดล่าสุด)
pm2 logs inbox-nextjs --lines 100

# Restart application
pm2 restart inbox-nextjs

# Stop application
pm2 stop inbox-nextjs

# Start application
pm2 start inbox-nextjs

# ดู resource usage
pm2 monit

# บันทึก configuration
pm2 save

# ลบ application จาก PM2
pm2 delete inbox-nextjs
```

### Application Commands

```bash
# ไปที่ directory
cd /var/www/inbox-nextjs

# ติดตั้ง dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Push database schema
npm run db:push

# Seed database
npm run db:seed

# Build application
npm run build

# Start (development)
npm run dev

# Start (production)
npm start

# เปิด Prisma Studio
npm run db:studio

# ทดสอบ authentication
npm run test:auth

# Migrate จาก PHP
npm run migrate:from-php
```

### Database Commands

```bash
# เชื่อมต่อ MySQL
mysql -u your_user -p pharmacy_crm

# Backup database
mysqldump -u your_user -p pharmacy_crm > backup.sql

# Restore database
mysql -u your_user -p pharmacy_crm < backup.sql

# ดู tables
mysql -u your_user -p pharmacy_crm -e "SHOW TABLES;"

# ดูจำนวน messages
mysql -u your_user -p pharmacy_crm -e "SELECT COUNT(*) FROM messages;"
```

### Nginx Commands

```bash
# ทดสอบ configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# ดู status
sudo systemctl status nginx

# ดู error logs
sudo tail -f /var/log/nginx/error.log

# ดู access logs
sudo tail -f /var/log/nginx/access.log
```

### System Commands

```bash
# ดู disk usage
df -h

# ดู memory usage
free -h

# ดู running processes
top

# ดู port ที่ใช้งาน
sudo lsof -i :3000

# Kill process บน port 3000
sudo kill -9 $(lsof -t -i:3000)

# ดู system logs
sudo journalctl -xe
```

---

## 🔍 การแก้ปัญหา

### ปัญหา: Application ไม่ทำงาน

```bash
# 1. ตรวจสอบ PM2 status
pm2 status

# 2. ดู logs
pm2 logs inbox-nextjs --lines 50

# 3. Restart
pm2 restart inbox-nextjs

# 4. ถ้ายังไม่ได้ ลอง rebuild
cd /var/www/inbox-nextjs
npm run build
pm2 restart inbox-nextjs
```

### ปัญหา: Database connection error

```bash
# 1. ตรวจสอบ .env.local
cat /var/www/inbox-nextjs/.env.local

# 2. ทดสอบ MySQL connection
mysql -u your_user -p pharmacy_crm

# 3. ถ้าเข้าได้ แก้ไข DATABASE_URL
nano /var/www/inbox-nextjs/.env.local

# 4. Restart application
pm2 restart inbox-nextjs
```

### ปัญหา: 502 Bad Gateway

```bash
# 1. ตรวจสอบ Next.js รันอยู่หรือไม่
curl http://localhost:3000/inbox

# 2. ตรวจสอบ Nginx config
sudo nginx -t

# 3. Restart ทั้งสอง
pm2 restart inbox-nextjs
sudo systemctl reload nginx
```

### ปัญหา: Login ไม่ได้

```bash
# 1. ทดสอบ authentication
cd /var/www/inbox-nextjs
npm run test:auth

# 2. ถ้า password ไม่ถูกต้อง script จะ update ให้อัตโนมัติ

# 3. Login ด้วย:
# Username: admin
# Password: password123
```

### ปัญหา: Port 3000 already in use

```bash
# 1. หา process ที่ใช้ port
sudo lsof -i :3000

# 2. Kill process
sudo kill -9 <PID>

# 3. Start application ใหม่
pm2 restart inbox-nextjs
```

---

## 📊 การตรวจสอบสถานะ

### Health Check

```bash
# รัน health check script
cd /var/www/inbox-nextjs
./health-check.sh

# จะตรวจสอบ:
# - Node.js version
# - PM2 status
# - Dependencies
# - Database connection
# - Nginx configuration
# - และอื่นๆ
```

### ดู Logs แบบ Real-time

```bash
# Application logs
pm2 logs inbox-nextjs

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -f -u nginx
```

---

## 🔄 การอัปเดตระบบ

### อัปเดต Inbox Next.js

```bash
# 1. ไปที่ directory
cd /var/www/inbox-nextjs

# 2. Backup ก่อน
cp -r . ../inbox-nextjs-backup

# 3. Pull code ใหม่ (ถ้าใช้ git)
git pull origin main

# หรือ upload files ใหม่ด้วย FTP/SFTP

# 4. Install dependencies
npm install

# 5. Run migrations (ถ้ามี)
npm run db:push

# 6. Rebuild
npm run build

# 7. Restart
pm2 restart inbox-nextjs

# 8. ตรวจสอบ
pm2 logs inbox-nextjs
```

### อัปเดต Dependencies

```bash
cd /var/www/inbox-nextjs

# Update all packages
npm update

# Rebuild
npm run build

# Restart
pm2 restart inbox-nextjs
```

---

## 🔐 ความปลอดภัย

### เปลี่ยน Admin Password

```bash
cd /var/www/inbox-nextjs

# รัน script เพื่อ update password
npm run test:auth

# หรือใช้ Prisma Studio
npm run db:studio
# แล้วแก้ไขใน admin_users table
```

### Generate NEXTAUTH_SECRET ใหม่

```bash
# Generate secret ใหม่
openssl rand -base64 32

# Copy ผลลัพธ์

# แก้ไข .env.local
nano /var/www/inbox-nextjs/.env.local
# อัปเดต NEXTAUTH_SECRET

# Restart
pm2 restart inbox-nextjs
```

---

## 📦 Backup & Restore

### Backup

```bash
# Backup database
mysqldump -u your_user -p pharmacy_crm > backup-$(date +%Y%m%d).sql

# Backup application files
tar -czf inbox-nextjs-backup-$(date +%Y%m%d).tar.gz /var/www/inbox-nextjs

# Backup .env.local
cp /var/www/inbox-nextjs/.env.local ~/env-backup-$(date +%Y%m%d)
```

### Restore

```bash
# Restore database
mysql -u your_user -p pharmacy_crm < backup-20240124.sql

# Restore application files
tar -xzf inbox-nextjs-backup-20240124.tar.gz -C /var/www/

# Restart
pm2 restart inbox-nextjs
```

---

## 🌐 URLs ที่สำคัญ

```
Production:
  - Inbox:         https://yourdomain.com/inbox
  - Login:         https://yourdomain.com/inbox (auto redirect)
  - API:           https://yourdomain.com/api/inbox/*
  - Auth API:      https://yourdomain.com/api/auth/*

Development:
  - Inbox:         http://localhost:3000/inbox
  - Prisma Studio: http://localhost:5555

External:
  - LINE Developers: https://developers.line.biz/console/
  - Prisma Docs:     https://www.prisma.io/docs
  - Next.js Docs:    https://nextjs.org/docs
```

---

## 📱 Default Login

```
Username: admin
Password: password123

⚠️ แนะนำให้เปลี่ยน password หลังจาก login ครั้งแรก
```

---

## 📞 ติดต่อช่วยเหลือ

หากมีปัญหาหรือข้อสงสัย:

1. **ตรวจสอบ logs:**
   ```bash
   pm2 logs inbox-nextjs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **รัน health check:**
   ```bash
   cd /var/www/inbox-nextjs
   ./health-check.sh
   ```

3. **อ่านเอกสาร:**
   - `INSTALLATION_WIZARD.md` - คู่มือติดตั้ง
   - `HYBRID_DEPLOYMENT.md` - คู่มือ deployment
   - `INTEGRATION.md` - การเชื่อมต่อกับ PHP

4. **ติดต่อทีมพัฒนา:**
   - แนบ logs
   - แนบ screenshot
   - บอกขั้นตอนที่ทำ

---

## 💡 Tips & Tricks

### เพิ่มประสิทธิภาพ

```bash
# Enable Redis caching
sudo apt-get install redis-server
# แก้ไข .env.local เพิ่ม:
# REDIS_URL="redis://localhost:6379"
```

### Monitoring

```bash
# ติดตั้ง PM2 monitoring
pm2 install pm2-logrotate

# ตั้งค่า log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Auto-restart on file change

```bash
# Development mode only
pm2 start ecosystem.config.js --watch
```

---

## 🎯 Checklist สำหรับการใช้งานประจำวัน

- [ ] ตรวจสอบ PM2 status ทุกเช้า
- [ ] ดู logs ถ้ามีปัญหา
- [ ] Backup database ทุกสัปดาห์
- [ ] Update dependencies ทุกเดือน
- [ ] ตรวจสอบ disk space
- [ ] Monitor error logs

---

**เวอร์ชัน:** 1.0  
**อัปเดตล่าสุด:** 2024-01-24
