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

เพิ่ม:
- `DATABASE_URL` (เปลี่ยน localhost เป็น public IP)
- `NEXTAUTH_URL` (ใช้ URL ที่ Vercel ให้มา)
- `NEXTAUTH_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `PHP_API_URL`
- `NODE_ENV=production`

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
