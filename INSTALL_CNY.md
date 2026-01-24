# 🚀 คู่มือติดตั้งสำหรับ cny.re-ya.com

> คู่มือเฉพาะสำหรับโครงสร้างโปรเจคของคุณ

## 📁 โครงสร้างโปรเจค

```
~/public_html/cny.re-ya.com/
├── (ระบบ PHP เดิม)
│   ├── index.php
│   ├── admin/
│   ├── user/
│   ├── classes/
│   ├── includes/
│   └── ...
│
└── inbox-nextjs/          ← ติดตั้งที่นี่!
    ├── src/
    ├── prisma/
    ├── install.sh
    └── ...
```

---

## 🎯 ขั้นตอนติดตั้งแบบย่อ

### 1. อัปโหลดไฟล์

**ใช้ FileZilla หรือ WinSCP:**
- เชื่อมต่อ server
- ไปที่ `public_html/cny.re-ya.com/`
- อัปโหลดโฟลเดอร์ `inbox-nextjs` เข้าไป

### 2. SSH เข้า Server

```bash
ssh your-username@your-server-ip
```

### 3. รัน Installation Script

```bash
# ไปที่โฟลเดอร์โปรเจค
cd ~/public_html/cny.re-ya.com/inbox-nextjs

# ให้สิทธิ์รัน script
chmod +x install.sh health-check.sh

# รัน installation wizard
./install.sh
```

### 4. ตอบคำถาม

```
Database Configuration:
  - Host: localhost
  - Name: pharmacy_crm (หรือชื่อ database ของคุณ)
  - User: (database username ของคุณ)
  - Password: (database password ของคุณ)

Domain:
  - cny.re-ya.com

LINE Configuration:
  - Access Token: (จาก LINE Developers Console)
  - Secret: (จาก LINE Developers Console)
```

### 5. รอการติดตั้ง (5-10 นาที)

Script จะติดตั้งทุกอย่างให้อัตโนมัติ

### 6. ทดสอบ

เปิดเบราว์เซอร์:
```
https://cny.re-ya.com/inbox
```

---

## 🔧 การตั้งค่า Nginx

### ตำแหน่งไฟล์ Nginx Config

ระบบของคุณอาจใช้:
- `/etc/nginx/sites-available/cny.re-ya.com`
- `/etc/nginx/conf.d/cny.re-ya.com.conf`
- หรือ `/etc/nginx/nginx.conf`

### Configuration ที่ต้องเพิ่ม

```nginx
server {
    listen 80;
    server_name cny.re-ya.com;
    
    # Root สำหรับ PHP
    root /home/your-user/public_html/cny.re-ya.com;
    index index.php index.html;
    
    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
    
    # ===== เพิ่มส่วนนี้สำหรับ Inbox Next.js =====
    
    # Inbox Next.js
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
    
    # Inbox API
    location /api/inbox {
        proxy_pass http://localhost:3000/api/inbox;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # NextAuth API
    location /api/auth {
        proxy_pass http://localhost:3000/api/auth;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Next.js Static Files
    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }
    
    location /_next/image {
        proxy_pass http://localhost:3000/_next/image;
        proxy_set_header Host $host;
    }
    
    # ===== จบส่วนที่เพิ่ม =====
    
    # PHP System (default)
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### ทดสอบและ Reload

```bash
# ทดสอบ config
sudo nginx -t

# ถ้าผ่าน reload Nginx
sudo systemctl reload nginx
```

---

## 📝 เพิ่มเมนู Inbox ในระบบ PHP

### แก้ไข `includes/header.php` หรือ `includes/sidebar.php`

```php
<!-- เพิ่มเมนู Inbox -->
<li class="<?php echo (strpos($_SERVER['REQUEST_URI'], '/inbox') !== false) ? 'active' : ''; ?>">
    <a href="/inbox">
        <i class="fa fa-inbox"></i>
        <span>Inbox</span>
        <?php
        // (Optional) แสดงจำนวนข้อความที่ยังไม่ได้อ่าน
        if (isset($unread_count) && $unread_count > 0) {
            echo '<span class="badge badge-danger">' . $unread_count . '</span>';
        }
        ?>
    </a>
</li>
```

### (Optional) Query จำนวนข้อความที่ยังไม่ได้อ่าน

เพิ่มใน `includes/header.php` ก่อนแสดงเมนู:

```php
<?php
// ดึงจำนวนข้อความที่ยังไม่ได้อ่าน
if (isset($_SESSION['admin_id'])) {
    $admin_id = $_SESSION['admin_id'];
    
    $query = "
        SELECT COUNT(*) as unread_count
        FROM messages m
        LEFT JOIN conversation_assignments ca ON m.userId = ca.user_id
        WHERE m.direction = 'incoming'
        AND m.is_read = 0
        AND (ca.admin_id = ? OR ca.admin_id IS NULL)
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $admin_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $unread_count = $row['unread_count'] ?? 0;
}
?>
```

---

## 🔍 คำสั่งที่ใช้บ่อย

### ตรวจสอบสถานะ

```bash
# ไปที่ directory
cd ~/public_html/cny.re-ya.com/inbox-nextjs

# ตรวจสอบ PM2
pm2 status

# ดู logs
pm2 logs inbox-nextjs

# Health check
./health-check.sh
```

### Restart Application

```bash
cd ~/public_html/cny.re-ya.com/inbox-nextjs
pm2 restart inbox-nextjs
```

### อัปเดตระบบ

```bash
cd ~/public_html/cny.re-ya.com/inbox-nextjs

# Pull code ใหม่ (ถ้าใช้ git)
git pull

# หรืออัปโหลดไฟล์ใหม่ด้วย FTP

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart inbox-nextjs
```

---

## ❓ แก้ปัญหาเฉพาะ

### ปัญหา: Permission Denied

```bash
# ให้สิทธิ์ที่ถูกต้อง
cd ~/public_html/cny.re-ya.com
chmod -R 755 inbox-nextjs
chmod +x inbox-nextjs/install.sh
chmod +x inbox-nextjs/health-check.sh
```

### ปัญหา: Database Connection Error

```bash
# ตรวจสอบ .env.local
cd ~/public_html/cny.re-ya.com/inbox-nextjs
cat .env.local

# ทดสอบ MySQL connection
mysql -u your_user -p pharmacy_crm

# แก้ไข .env.local
nano .env.local
```

### ปัญหา: Port 3000 ถูกใช้งานอยู่

```bash
# หา process ที่ใช้ port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Start ใหม่
cd ~/public_html/cny.re-ya.com/inbox-nextjs
pm2 restart inbox-nextjs
```

---

## 📊 ตรวจสอบว่าทุกอย่างทำงาน

### Checklist

- [ ] ✅ ระบบ PHP เดิมทำงานปกติ: `https://cny.re-ya.com`
- [ ] ✅ Inbox ใหม่เปิดได้: `https://cny.re-ya.com/inbox`
- [ ] ✅ Login เข้าระบบได้
- [ ] ✅ PM2 status เป็น "online"
- [ ] ✅ Nginx config ถูกต้อง
- [ ] ✅ เมนู Inbox แสดงในระบบ PHP

---

## 🎯 URLs สำคัญ

```
Production:
  - PHP System:    https://cny.re-ya.com
  - Inbox:         https://cny.re-ya.com/inbox
  - API:           https://cny.re-ya.com/api/inbox/*
  - Auth:          https://cny.re-ya.com/api/auth/*

Development:
  - Inbox:         http://localhost:3000/inbox
  - Prisma Studio: http://localhost:5555
```

---

## 📞 ต้องการความช่วยเหลือ?

### 1. รัน Health Check

```bash
cd ~/public_html/cny.re-ya.com/inbox-nextjs
./health-check.sh
```

### 2. ดู Logs

```bash
# Application logs
pm2 logs inbox-nextjs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### 3. อ่านเอกสารเพิ่มเติม

- `INSTALLATION_WIZARD.md` - คู่มือติดตั้งแบบละเอียด
- `QUICK_REFERENCE.md` - คำสั่งที่ใช้บ่อย
- `INTEGRATION.md` - การเชื่อมต่อกับ PHP

---

## 🎉 เสร็จแล้ว!

ตอนนี้คุณมี:
- ✅ ระบบ PHP เดิมทำงานปกติ
- ✅ Inbox Next.js ทำงานบน `/inbox`
- ✅ ใช้ database เดียวกัน
- ✅ เชื่อมต่อกันผ่าน Nginx

**Login:**
- URL: `https://cny.re-ya.com/inbox`
- Username: `admin`
- Password: `password123` (ถ้ารัน seed)

**Good luck! 🚀**
