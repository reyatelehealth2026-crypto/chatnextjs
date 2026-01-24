# 🚀 คู่มือ Deploy ไป Vercel (สรุป)

> คู่มือสรุปการ push ไป GitHub แล้ว deploy ไป Vercel

## 📋 ขั้นตอนสรุป

### 1️⃣ Push ไป GitHub

```bash
# วิธีที่ 1: ใช้สคริปต์อัตโนมัติ
chmod +x push-to-github.sh
./push-to-github.sh

# วิธีที่ 2: Push ด้วยตนเอง
git add .
git commit -m "Add Vercel deployment configuration"
git push -u origin main
```

### 2️⃣ Deploy ไป Vercel

#### ใช้ Vercel Dashboard (แนะนำ) ⭐

1. ไปที่ [vercel.com](https://vercel.com)
2. คลิก **"Add New..."** → **"Project"**
3. เลือก **"Import Git Repository"**
4. เลือก GitHub repository `inbox-nextjs`
5. ตั้งค่า Environment Variables
6. คลิก **"Deploy"**

#### ใช้ Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 3️⃣ ตั้งค่า Environment Variables

ไปที่ **Vercel Dashboard** → **Project Settings** → **Environment Variables**

#### 📋 Template พร้อมใช้ (Copy-Paste)

```env
# Database (⚠️ เปลี่ยน localhost เป็น public IP หรือใช้ Prisma Data Proxy)
DATABASE_URL="mysql://USERNAME:PASSWORD@YOUR_SERVER_IP:3306/DATABASE_NAME?connection_limit=10"

# NextAuth (⚠️ ใช้ URL ที่ Vercel ให้มาหลัง deploy ครั้งแรก)
NEXTAUTH_URL="https://your-app.vercel.app"

# NextAuth Secret (ใช้จาก .env.local หรือ generate ใหม่)
NEXTAUTH_SECRET="your-secret-key-here"

# LINE API (จาก LINE Developers Console หรือ .env.local)
LINE_CHANNEL_ACCESS_TOKEN="your-line-access-token"
LINE_CHANNEL_SECRET="your-line-secret"

# PHP API URL
PHP_API_URL="https://cny.re-ya.com"

# Node Environment
NODE_ENV="production"
```

#### 📍 หาค่าจากที่ไหน?

| Variable | หาจาก | หมายเหตุ |
|----------|-------|----------|
| `DATABASE_URL` | `.env.local` | ⚠️ **สำคัญ**: เปลี่ยน `localhost` เป็น **public IP** หรือใช้ **Prisma Data Proxy** |
| `NEXTAUTH_URL` | Vercel Dashboard | จะได้หลัง deploy ครั้งแรก (เช่น `https://inbox-nextjs.vercel.app`) |
| `NEXTAUTH_SECRET` | `.env.local` | หรือ generate ใหม่: `openssl rand -base64 32` |
| `LINE_CHANNEL_ACCESS_TOKEN` | `.env.local` หรือ [LINE Developers Console](https://developers.line.biz/console/) | |
| `LINE_CHANNEL_SECRET` | `.env.local` หรือ [LINE Developers Console](https://developers.line.biz/console/) | |
| `PHP_API_URL` | `.env.local` | ใช้ค่าเดิม (เช่น `https://cny.re-ya.com`) |
| `NODE_ENV` | - | ใช้ `production` |

**ดูรายละเอียดเพิ่มเติม**: อ่าน [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md) หรือ [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### 4️⃣ Redeploy

หลังตั้งค่า Environment Variables:

```bash
vercel --prod
```

หรือ Vercel จะ auto-deploy เมื่อ push code ใหม่ไป GitHub

---

## 📚 เอกสารเพิ่มเติม

- **[GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)** - คู่มือละเอียดการ push ไป GitHub
- **[QUICK_DEPLOY_VERCEL.md](./QUICK_DEPLOY_VERCEL.md)** - Deploy แบบเร็ว
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - คู่มือละเอียด
- **[DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)** - Checklist

---

## ⚡ Quick Start

```bash
# 1. Push ไป GitHub
./push-to-github.sh

# 2. ไปที่ Vercel Dashboard → Import Project จาก GitHub

# 3. ตั้งค่า Environment Variables

# 4. Deploy!
```

---

🎉 **Happy Deploying!**
