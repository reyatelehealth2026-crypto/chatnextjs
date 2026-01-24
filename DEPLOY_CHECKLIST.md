# ✅ Checklist ก่อน Deploy ไป Vercel

## 📋 ขั้นตอนการเตรียมตัว

### 1. ตรวจสอบไฟล์ที่จำเป็น

- [x] `vercel.json` - Configuration file
- [x] `.vercelignore` - ไฟล์ที่จะไม่ upload
- [x] `next.config.js` - ปรับให้รองรับ Vercel แล้ว
- [x] `package.json` - มี `postinstall` script
- [ ] `.env.local` - ตรวจสอบว่ามีค่าครบถ้วน

### 2. Environment Variables ที่ต้องตั้งค่าใน Vercel

#### ⚠️ สำคัญ: ต้องตั้งค่าใน Vercel Dashboard → Project Settings → Environment Variables

- [ ] `DATABASE_URL` 
  - **จาก**: `.env.local` = `mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny`
  - **สำหรับ Vercel**: ต้องเปลี่ยน `localhost` เป็น **public IP** หรือใช้ **Prisma Data Proxy**
  - **ตัวอย่าง**: `mysql://user:pass@YOUR_SERVER_IP:3306/db?connection_limit=10`

- [ ] `NEXTAUTH_URL`
  - **จะได้หลัง**: Deploy ครั้งแรกบน Vercel
  - **ตัวอย่าง**: `https://inbox-nextjs.vercel.app` (ไม่มี trailing slash)

- [ ] `NEXTAUTH_SECRET`
  - **จาก**: `.env.local` = `iuh8AVPjKMygQ9tQdKvYIQkHsAWhQ/j32Jj2Zwa1wdM=`
  - **หรือ Generate ใหม่**: `openssl rand -base64 32`

- [ ] `LINE_CHANNEL_ACCESS_TOKEN`
  - **จาก**: `.env.local` หรือ [LINE Developers Console](https://developers.line.biz/console/)

- [ ] `LINE_CHANNEL_SECRET`
  - **จาก**: `.env.local` หรือ [LINE Developers Console](https://developers.line.biz/console/)

- [ ] `PHP_API_URL`
  - **จาก**: `.env.local` = `https://cny.re-ya.com`

- [ ] `NODE_ENV`
  - **ค่า**: `production`

### 3. Database Connection

#### ตัวเลือกที่ 1: ใช้ Prisma Data Proxy (แนะนำ) ⭐

```bash
# 1. ติดตั้ง Prisma CLI
npm install -g prisma

# 2. สร้าง Data Proxy
npx prisma generate --data-proxy

# 3. ใช้ connection string จาก Prisma Data Proxy
# ใน Vercel Environment Variables
```

#### ตัวเลือกที่ 2: ใช้ Connection Pooling

```bash
# เปลี่ยน DATABASE_URL เป็น:
mysql://user:pass@YOUR_SERVER_IP:3306/db?connection_limit=10
```

#### ตัวเลือกที่ 3: เปิด MySQL Port Public (ไม่แนะนำ)

```bash
# ต้องตั้งค่า firewall และ MySQL bind-address
# ⚠️ เสี่ยงด้านความปลอดภัย
```

### 4. ทดสอบ Build Locally

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npm run db:generate

# 3. Build
npm run build

# ถ้า build สำเร็จ แสดงว่าพร้อม deploy แล้ว
```

### 5. Deploy

#### วิธีที่ 1: ใช้สคริปต์อัตโนมัติ

```bash
# ให้สิทธิ์รัน script
chmod +x deploy-vercel.sh

# รัน script
./deploy-vercel.sh
```

#### วิธีที่ 2: ใช้ Vercel CLI

```bash
# 1. ติดตั้ง Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

#### วิธีที่ 3: ใช้ Vercel Dashboard

1. ไปที่ [vercel.com](https://vercel.com)
2. Import project จาก GitHub/GitLab
3. ตั้งค่า Environment Variables
4. Deploy

---

## 🚀 ขั้นตอน Deploy แบบละเอียด

### Step 1: ติดตั้ง Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy ครั้งแรก (ยังไม่ตั้ง Environment Variables)

```bash
cd inbox-nextjs
vercel
```

**ตอบคำถาม:**
- Set up and deploy? → `Y`
- Which scope? → เลือก account ของคุณ
- Link to existing project? → `N`
- Project name? → `inbox-nextjs`
- Directory? → `./`
- Override settings? → `N`

### Step 4: ตั้งค่า Environment Variables

1. ไปที่ Vercel Dashboard → Project → Settings → Environment Variables
2. เพิ่ม Environment Variables ตามรายการด้านบน
3. **สำคัญ**: `NEXTAUTH_URL` ใช้ URL ที่ Vercel ให้มา (เช่น `https://inbox-nextjs.vercel.app`)

### Step 5: Deploy Production

```bash
vercel --prod
```

---

## 🔍 ตรวจสอบหลัง Deploy

- [ ] เปิด URL ที่ Vercel ให้มา
- [ ] ทดสอบหน้า Login: `https://your-app.vercel.app/auth/login`
- [ ] ทดสอบหน้า Inbox: `https://your-app.vercel.app/inbox`
- [ ] ตรวจสอบ Logs ใน Vercel Dashboard
- [ ] ตรวจสอบ Database Connection

---

## 🐛 แก้ไขปัญหา

### Build ล้มเหลว

```bash
# ตรวจสอบ build logs
vercel logs

# ทดสอบ build locally
npm run build
```

### Database Connection Error

1. ตรวจสอบ `DATABASE_URL` ใน Environment Variables
2. ตรวจสอบว่า database server อนุญาต connection จาก Vercel IP
3. ใช้ Prisma Data Proxy หรือ Connection Pooling

### NextAuth URL Mismatch

1. ตรวจสอบ `NEXTAUTH_URL` ต้องตรงกับ Vercel domain
2. ไม่มี trailing slash `/`
3. ใช้ `https://` เท่านั้น

---

## 📚 เอกสารเพิ่มเติม

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - คู่มือละเอียด
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## ✅ สรุป

เมื่อทำตาม checklist นี้ครบแล้ว คุณจะสามารถ deploy ไป Vercel ได้สำเร็จ!

🎉 **Happy Deploying!**
