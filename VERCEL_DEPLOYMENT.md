# 🚀 คู่มือการ Deploy ไป Vercel

> คู่มือการแยก deploy Inbox Next.js ไป Vercel แยกจากระบบ PHP

## 📋 สิ่งที่ต้องรู้ก่อน Deploy

### ⚠️ ข้อพิจารณาสำคัญ

1. **Database Connection**
   - ต้องเชื่อมต่อ MySQL ที่อยู่บน server เดิม
   - Vercel serverless functions มี connection limit
   - **แนะนำ**: ใช้ Prisma Data Proxy หรือ Connection Pooling

2. **Environment Variables**
   - `DATABASE_URL` - ต้องเป็น public IP หรือใช้ connection proxy
   - `NEXTAUTH_URL` - ต้องเป็น Vercel domain (เช่น `https://your-app.vercel.app`)
   - `PHP_API_URL` - URL ของ PHP system (เช่น `https://cny.re-ya.com`)

3. **Prisma**
   - ต้อง generate Prisma Client ใน build time
   - Vercel จะรัน `prisma generate` อัตโนมัติ

---

## 🎯 ขั้นตอนการ Deploy

### ขั้นตอนที่ 1: เตรียม Database Connection

#### วิธีที่ 1: ใช้ Prisma Data Proxy (แนะนำ) ⭐

```bash
# 1. ติดตั้ง Prisma Data Proxy CLI
npm install -g prisma

# 2. สร้าง Data Proxy
npx prisma generate --data-proxy

# 3. เพิ่ม DATABASE_URL ใน Vercel Environment Variables
# ใช้ connection string จาก Prisma Data Proxy
```

#### วิธีที่ 2: ใช้ Connection Pooling (PlanetScale, Railway, etc.)

```bash
# ใช้ connection string ที่มี connection pooling
# เช่น: mysql://user:pass@host:3306/db?connection_limit=10
```

#### วิธีที่ 3: เปิด MySQL Port ให้ Public (ไม่แนะนำ - เสี่ยงด้านความปลอดภัย)

```bash
# ต้องตั้งค่า firewall และ MySQL bind-address
# แนะนำให้ใช้วิธีที่ 1 หรือ 2 แทน
```

### ขั้นตอนที่ 2: ปรับ next.config.js

ไฟล์ `next.config.js` ถูกปรับให้รองรับ Vercel แล้ว:
- ลบ `output: 'standalone'` (Vercel ไม่ต้องการ)
- รองรับ Prisma build time generation

### ขั้นตอนที่ 3: สร้าง Vercel Project

#### วิธีที่ 1: ใช้ Vercel CLI

```bash
# 1. ติดตั้ง Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd inbox-nextjs
vercel

# 4. Follow prompts:
# - Set up and deploy? Y
# - Which scope? [เลือก account]
# - Link to existing project? N
# - Project name? inbox-nextjs
# - Directory? ./
# - Override settings? N
```

#### วิธีที่ 2: ใช้ Vercel Dashboard

1. ไปที่ [vercel.com](https://vercel.com)
2. Import project จาก GitHub/GitLab
3. ตั้งค่า Build Command: `npm run build`
4. ตั้งค่า Output Directory: `.next`

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

ใน Vercel Dashboard → Project Settings → Environment Variables:

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/database?connection_limit=10"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key-here"

# LINE API
LINE_CHANNEL_ACCESS_TOKEN="your-line-token"
LINE_CHANNEL_SECRET="your-line-secret"

# PHP API
PHP_API_URL="https://cny.re-ya.com"

# Node Environment
NODE_ENV="production"
```

#### 📍 หาค่าจากที่ไหน?

**1. DATABASE_URL**
- **หาจาก**: ไฟล์ `.env.local` ในโปรเจกต์ (ดูตัวอย่างด้านล่าง)
- **ตัวอย่างจาก .env.local**: `mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny`
- **⚠️ สำคัญ**: สำหรับ Vercel ต้องเปลี่ยนจาก `localhost` เป็น **public IP** หรือใช้ **connection pooling**
- **วิธีแก้**: 
  ```bash
  # จาก .env.local
  DATABASE_URL="mysql://user:pass@localhost:3306/db"
  
  # สำหรับ Vercel (เปลี่ยน localhost เป็น public IP)
  DATABASE_URL="mysql://user:pass@YOUR_SERVER_IP:3306/db?connection_limit=10"
  
  # หรือใช้ Prisma Data Proxy (แนะนำ)
  DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
  ```

**2. NEXTAUTH_URL**
- **หาจาก**: จะได้หลัง deploy ครั้งแรกบน Vercel
- **ขั้นตอน**:
  1. Deploy ครั้งแรก (ยังไม่ต้องตั้ง NEXTAUTH_URL)
  2. Vercel จะให้ URL เช่น `https://inbox-nextjs.vercel.app`
  3. ใช้ URL นี้เป็น `NEXTAUTH_URL`
- **ตัวอย่าง**: `https://inbox-nextjs.vercel.app` (ไม่มี trailing slash `/`)

**3. NEXTAUTH_SECRET**
- **หาจาก**: ไฟล์ `.env.local` หรือ generate ใหม่
- **จาก .env.local**: `iuh8AVPjKMygQ9tQdKvYIQkHsAWhQ/j32Jj2Zwa1wdM=`
- **หรือ Generate ใหม่** (แนะนำ):
  ```bash
  openssl rand -base64 32
  ```

**4. LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET**
- **หาจาก**: ไฟล์ `.env.local` หรือ LINE Developers Console
- **จาก .env.local**: ดูค่าในไฟล์ (อาจว่างเปล่า)
- **หรือหาใหม่**: [LINE Developers Console](https://developers.line.biz/console/)

**5. PHP_API_URL**
- **หาจาก**: Domain ของ PHP system
- **ตัวอย่าง**: `https://cny.re-ya.com` (จาก .env.local)

**วิธี Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### ขั้นตอนที่ 5: Build Settings

ใน Vercel Dashboard → Project Settings → Build & Development Settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Root Directory**: `./`

### ขั้นตอนที่ 6: Deploy

```bash
# Deploy to production
vercel --prod

# หรือ push code ไป GitHub แล้ว Vercel จะ auto-deploy
git push origin main
```

---

## 🔧 การตั้งค่า Custom Domain

1. ไปที่ Vercel Dashboard → Project → Settings → Domains
2. เพิ่ม domain ที่ต้องการ (เช่น `inbox.cny.re-ya.com`)
3. ตั้งค่า DNS records ตามที่ Vercel แนะนำ:
   ```
   Type: CNAME
   Name: inbox (หรือ subdomain ที่ต้องการ)
   Value: cname.vercel-dns.com
   ```
4. รอ DNS propagation (ประมาณ 5-10 นาที)

---

## 🔗 การเชื่อมต่อกับระบบ PHP

### 1. ตั้งค่า PHP_API_URL

```env
PHP_API_URL="https://cny.re-ya.com"
```

### 2. ตั้งค่า CORS ใน PHP (ถ้าจำเป็น)

ถ้า PHP API ต้องรองรับ CORS จาก Vercel domain:

```php
// ใน PHP API
header('Access-Control-Allow-Origin: https://your-app.vercel.app');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
```

### 3. ตั้งค่า Nginx ใน PHP Server (ถ้าต้องการ)

ถ้าต้องการให้ PHP server proxy ไป Vercel:

```nginx
location /inbox {
    proxy_pass https://your-app.vercel.app/inbox;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 📊 การตรวจสอบและ Monitoring

### 1. ตรวจสอบ Logs

```bash
# ดู logs ใน Vercel Dashboard
# หรือใช้ Vercel CLI
vercel logs
```

### 2. ตรวจสอบ Health Check

```bash
# ทดสอบ API endpoint
curl https://your-app.vercel.app/api/health

# ทดสอบ Inbox page
curl https://your-app.vercel.app/inbox
```

### 3. ตรวจสอบ Database Connection

```bash
# ใช้ Vercel CLI
vercel env pull .env.local
npm run db:studio
```

---

## 🐛 แก้ไขปัญหาที่พบบ่อย

### ปัญหา 1: "Cannot connect to database"

**สาเหตุ**: Database connection ไม่ถูกต้อง

**แก้ไข**:
1. ตรวจสอบ `DATABASE_URL` ใน Environment Variables
2. ตรวจสอบว่า database server อนุญาต connection จาก Vercel IP
3. ใช้ Prisma Data Proxy หรือ Connection Pooling

### ปัญหา 2: "Prisma Client not generated"

**สาเหตุ**: Prisma Client ไม่ได้ generate ใน build time

**แก้ไข**:
1. เพิ่ม `postinstall` script ใน `package.json`:
   ```json
   "scripts": {
     "postinstall": "prisma generate"
   }
   ```
2. หรือใช้ Vercel Build Command: `npm install && prisma generate && npm run build`

### ปัญหา 3: "NextAuth URL mismatch"

**สาเหตุ**: `NEXTAUTH_URL` ไม่ตรงกับ Vercel domain

**แก้ไข**:
1. ตรวจสอบ `NEXTAUTH_URL` ใน Environment Variables
2. ต้องเป็น `https://your-app.vercel.app` (ไม่มี trailing slash)

### ปัญหา 4: "Build timeout"

**สาเหตุ**: Build ใช้เวลานานเกินไป

**แก้ไข**:
1. ลด dependencies ที่ไม่จำเป็น
2. ใช้ `.vercelignore` เพื่อ ignore ไฟล์ที่ไม่จำเป็น
3. ตรวจสอบ build logs เพื่อหาสาเหตุ

### ปัญหา 5: "Function timeout"

**สาเหตุ**: API route ใช้เวลานานเกินไป

**แก้ไข**:
1. เพิ่ม timeout ใน `vercel.json`:
   ```json
   {
     "functions": {
       "src/app/api/**/*.ts": {
         "maxDuration": 30
       }
     }
   }
   ```
2. Optimize database queries
3. ใช้ caching

---

## 📝 Checklist ก่อน Deploy

- [ ] ตั้งค่า `DATABASE_URL` ให้ถูกต้อง
- [ ] ตั้งค่า `NEXTAUTH_URL` เป็น Vercel domain
- [ ] Generate `NEXTAUTH_SECRET` ใหม่
- [ ] ตั้งค่า `PHP_API_URL` ให้ถูกต้อง
- [ ] ตั้งค่า LINE credentials
- [ ] ทดสอบ build locally: `npm run build`
- [ ] ตรวจสอบ Prisma schema
- [ ] ตั้งค่า custom domain (ถ้าต้องการ)
- [ ] ตั้งค่า environment variables ใน Vercel
- [ ] Deploy และทดสอบ

---

## 🔐 Security Best Practices

1. **Environment Variables**
   - อย่า commit `.env.local` ไป Git
   - ใช้ Vercel Environment Variables แทน
   - ใช้ different secrets สำหรับ production และ preview

2. **Database**
   - ใช้ connection pooling
   - จำกัด database access
   - ใช้ SSL/TLS connection

3. **API Security**
   - ใช้ HTTPS เท่านั้น
   - ตั้งค่า CORS ให้ถูกต้อง
   - Validate input data

---

## 📚 เอกสารเพิ่มเติม

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Data Proxy](https://www.prisma.io/docs/data-platform/data-proxy)
- [NextAuth.js Deployment](https://next-auth.js.org/configuration/options#nextauth_url)

---

## 🆘 ต้องการความช่วยเหลือ?

1. ตรวจสอบ Vercel Logs
2. ตรวจสอบ Build Logs
3. ทดสอบ locally ก่อน deploy
4. อ่าน [Vercel Troubleshooting Guide](https://vercel.com/docs/troubleshooting)

---

## ✅ สรุป

การ deploy ไป Vercel มีข้อดี:
- ✅ Auto-scaling
- ✅ Global CDN
- ✅ Zero-config deployment
- ✅ Preview deployments
- ✅ Built-in monitoring

แต่ต้องพิจารณา:
- ⚠️ Database connection (ต้องใช้ connection pooling)
- ⚠️ Serverless function limits
- ⚠️ Cold start latency

🎉 **Happy Deploying!**
