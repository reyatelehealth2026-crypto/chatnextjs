# ⚡ Quick Deploy to Vercel

> คู่มือ deploy ไป Vercel แบบเร็ว (5 นาที)

## 🚀 วิธีที่ 1: ใช้สคริปต์อัตโนมัติ (ง่ายที่สุด)

```bash
# 1. ให้สิทธิ์รัน script
chmod +x deploy-vercel.sh

# 2. รัน script
./deploy-vercel.sh
```

สคริปต์จะ:
- ✅ ตรวจสอบ Vercel CLI
- ✅ Login อัตโนมัติ
- ✅ ตรวจสอบ dependencies
- ✅ Build project
- ✅ Deploy ไป Vercel

---

## 🛠️ วิธีที่ 2: Deploy ด้วยตนเอง

### Step 1: ติดตั้ง Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
cd inbox-nextjs
vercel --prod
```

---

## ⚙️ ตั้งค่า Environment Variables

**สำคัญ**: ต้องตั้งค่าใน Vercel Dashboard → Project Settings → Environment Variables

### 1. ไปที่ Vercel Dashboard

1. เปิด [vercel.com/dashboard](https://vercel.com/dashboard)
2. เลือก Project ที่ deploy แล้ว
3. ไปที่ **Settings** → **Environment Variables**

### 2. เพิ่ม Environment Variables

| Variable | ค่าจาก .env.local | ค่าสำหรับ Vercel |
|----------|------------------|------------------|
| `DATABASE_URL` | `mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny` | เปลี่ยน `localhost` เป็น **public IP** หรือใช้ **Prisma Data Proxy** |
| `NEXTAUTH_URL` | `https://cny.re-ya.com` | URL ที่ Vercel ให้มา (เช่น `https://inbox-nextjs.vercel.app`) |
| `NEXTAUTH_SECRET` | `iuh8AVPjKMygQ9tQdKvYIQkHsAWhQ/j32Jj2Zwa1wdM=` | ใช้ค่าเดิมหรือ generate ใหม่ |
| `LINE_CHANNEL_ACCESS_TOKEN` | (ว่าง) | จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | (ว่าง) | จาก LINE Developers Console |
| `PHP_API_URL` | `https://cny.re-ya.com` | ใช้ค่าเดิม |
| `NODE_ENV` | `production` | `production` |

### 3. ⚠️ สำคัญ: DATABASE_URL

**ปัญหาที่พบบ่อย**: `localhost` ไม่สามารถเชื่อมต่อจาก Vercel ได้

**วิธีแก้**:

#### ตัวเลือก A: ใช้ Prisma Data Proxy (แนะนำ) ⭐

```bash
# 1. ติดตั้ง Prisma CLI
npm install -g prisma

# 2. สร้าง Data Proxy
npx prisma generate --data-proxy

# 3. ใช้ connection string จาก Prisma Data Proxy
# ใน Vercel Environment Variables
```

#### ตัวเลือก B: เปลี่ยนเป็น Public IP

```bash
# เปลี่ยนจาก:
DATABASE_URL="mysql://user:pass@localhost:3306/db"

# เป็น:
DATABASE_URL="mysql://user:pass@YOUR_SERVER_IP:3306/db?connection_limit=10"
```

---

## 🔄 Redeploy หลังตั้งค่า Environment Variables

```bash
# Redeploy เพื่อให้ environment variables มีผล
vercel --prod
```

---

## ✅ ตรวจสอบ

1. เปิด URL ที่ Vercel ให้มา
2. ทดสอบหน้า Login: `https://your-app.vercel.app/auth/login`
3. ทดสอบหน้า Inbox: `https://your-app.vercel.app/inbox`
4. ตรวจสอบ Logs ใน Vercel Dashboard

---

## 🐛 แก้ไขปัญหา

### Build ล้มเหลว

```bash
# ทดสอบ build locally
npm run build

# ดู build logs
vercel logs
```

### Database Connection Error

1. ตรวจสอบ `DATABASE_URL` ใน Environment Variables
2. ใช้ Prisma Data Proxy หรือ Connection Pooling
3. ตรวจสอบว่า database server อนุญาต connection จาก Vercel IP

### NextAuth URL Mismatch

1. ตรวจสอบ `NEXTAUTH_URL` ต้องตรงกับ Vercel domain
2. ไม่มี trailing slash `/`
3. ใช้ `https://` เท่านั้น

---

## 📚 เอกสารเพิ่มเติม

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - คู่มือละเอียด
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) - Checklist ก่อน deploy

---

## 🎉 เสร็จแล้ว!

เมื่อทำตามขั้นตอนนี้ คุณจะ deploy ไป Vercel สำเร็จ!

**Happy Deploying!** 🚀
