# 📦 Push ไป GitHub แล้ว Deploy ไป Vercel

> คู่มือการ push code ไป GitHub แล้ว deploy ไป Vercel

## 🚀 ขั้นตอนที่ 1: Push ไป GitHub

### วิธีที่ 1: ใช้สคริปต์อัตโนมัติ (ง่ายที่สุด)

```bash
# 1. ให้สิทธิ์รัน script
chmod +x push-to-github.sh

# 2. รัน script
./push-to-github.sh
```

### วิธีที่ 2: Push ด้วยตนเอง

#### Step 1: ตรวจสอบสถานะ Git

```bash
cd inbox-nextjs
git status
```

#### Step 2: เพิ่ม Remote Repository (ถ้ายังไม่มี)

```bash
# เพิ่ม remote repository
git remote add origin https://github.com/USERNAME/REPO.git

# หรือถ้ามีอยู่แล้ว ตรวจสอบ
git remote -v
```

#### Step 3: เพิ่มไฟล์

```bash
# เพิ่มไฟล์ทั้งหมด
git add .

# หรือเพิ่มเฉพาะไฟล์ที่ต้องการ
git add vercel.json .vercelignore deploy-vercel.sh
```

#### Step 4: Commit

```bash
git commit -m "Add Vercel deployment configuration"
```

#### Step 5: Push ไป GitHub

```bash
# Push ไป branch main
git push -u origin main

# หรือ push ไป branch อื่น
git push -u origin your-branch-name
```

---

## 🔗 ขั้นตอนที่ 2: Deploy ไป Vercel จาก GitHub

### วิธีที่ 1: ใช้ Vercel Dashboard (แนะนำ) ⭐

1. **ไปที่ Vercel Dashboard**
   - เปิด [vercel.com](https://vercel.com)
   - Login เข้าระบบ

2. **Import Project**
   - คลิก **"Add New..."** → **"Project"**
   - เลือก **"Import Git Repository"**
   - เลือก GitHub account
   - เลือก repository `inbox-nextjs`

3. **ตั้งค่า Project**
   - **Project Name**: `inbox-nextjs`
   - **Framework Preset**: Next.js (auto-detect)
   - **Root Directory**: `./` (หรือ `inbox-nextjs` ถ้า repo อยู่ใน subfolder)
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `.next` (auto)

4. **ตั้งค่า Environment Variables**
   - ก่อน deploy คลิก **"Environment Variables"**
   - เพิ่ม Environment Variables ตามรายการ:
     ```
     DATABASE_URL=...
     NEXTAUTH_URL=...
     NEXTAUTH_SECRET=...
     LINE_CHANNEL_ACCESS_TOKEN=...
     LINE_CHANNEL_SECRET=...
     PHP_API_URL=...
     NODE_ENV=production
     ```
   - **สำคัญ**: `NEXTAUTH_URL` จะได้หลัง deploy ครั้งแรก

5. **Deploy**
   - คลิก **"Deploy"**
   - รอ build เสร็จ (ประมาณ 2-5 นาที)

6. **อัปเดต NEXTAUTH_URL**
   - หลัง deploy สำเร็จ Vercel จะให้ URL เช่น `https://inbox-nextjs.vercel.app`
   - ไปที่ **Settings** → **Environment Variables**
   - อัปเดต `NEXTAUTH_URL` เป็น URL ที่ Vercel ให้มา
   - **Redeploy** เพื่อให้ environment variable มีผล

### วิธีที่ 2: ใช้ Vercel CLI

```bash
# 1. ติดตั้ง Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link project (ถ้ายังไม่ได้ link)
vercel link

# 4. Deploy
vercel --prod
```

---

## ⚙️ ตั้งค่า Environment Variables ใน Vercel

### ไปที่ Vercel Dashboard

1. เปิด [vercel.com/dashboard](https://vercel.com/dashboard)
2. เลือก Project `inbox-nextjs`
3. ไปที่ **Settings** → **Environment Variables**

### เพิ่ม Environment Variables

| Variable | ค่าจาก .env.local | ค่าสำหรับ Vercel |
|----------|------------------|------------------|
| `DATABASE_URL` | `mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny` | เปลี่ยน `localhost` เป็น **public IP** หรือใช้ **Prisma Data Proxy** |
| `NEXTAUTH_URL` | `https://cny.re-ya.com` | URL ที่ Vercel ให้มา (เช่น `https://inbox-nextjs.vercel.app`) |
| `NEXTAUTH_SECRET` | `iuh8AVPjKMygQ9tQdKvYIQkHsAWhQ/j32Jj2Zwa1wdM=` | ใช้ค่าเดิมหรือ generate ใหม่ |
| `LINE_CHANNEL_ACCESS_TOKEN` | (ว่าง) | จาก LINE Developers Console |
| `LINE_CHANNEL_SECRET` | (ว่าง) | จาก LINE Developers Console |
| `PHP_API_URL` | `https://cny.re-ya.com` | ใช้ค่าเดิม |
| `NODE_ENV` | `production` | `production` |

### ⚠️ สำคัญ: DATABASE_URL

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

## 🔄 Auto Deploy จาก GitHub

เมื่อ push code ไป GitHub Vercel จะ auto-deploy อัตโนมัติ:

1. **Push code ไป GitHub**
   ```bash
   git push origin main
   ```

2. **Vercel จะ auto-deploy**
   - ไปที่ Vercel Dashboard
   - จะเห็น deployment ใหม่เริ่มต้นอัตโนมัติ

3. **ตรวจสอบ Deployment**
   - ดู logs ใน Vercel Dashboard
   - ตรวจสอบ URL ที่ deploy แล้ว

---

## ✅ Checklist

### ก่อน Push ไป GitHub

- [ ] ตรวจสอบ `.gitignore` ว่ามี `.env.local` และไฟล์ sensitive อื่นๆ
- [ ] ตรวจสอบว่าไม่มีข้อมูล sensitive ใน code
- [ ] Commit ไฟล์ที่จำเป็น
- [ ] ตั้งค่า remote repository

### ก่อน Deploy ไป Vercel

- [ ] Push code ไป GitHub สำเร็จ
- [ ] Import project ใน Vercel Dashboard
- [ ] ตั้งค่า Environment Variables
- [ ] ตั้งค่า `DATABASE_URL` ให้ถูกต้อง (ไม่ใช่ localhost)
- [ ] Deploy และทดสอบ

### หลัง Deploy

- [ ] ตรวจสอบ URL ที่ Vercel ให้มา
- [ ] อัปเดต `NEXTAUTH_URL` ใน Environment Variables
- [ ] Redeploy เพื่อให้ environment variables มีผล
- [ ] ทดสอบหน้า Login
- [ ] ทดสอบหน้า Inbox
- [ ] ตรวจสอบ Database Connection

---

## 🐛 แก้ไขปัญหา

### Git Push ล้มเหลว

```bash
# ตรวจสอบ remote
git remote -v

# Pull ก่อน push (ถ้ามี conflict)
git pull origin main

# Force push (ระวัง!)
git push -u origin main --force
```

### Vercel Build ล้มเหลว

1. ตรวจสอบ Build Logs ใน Vercel Dashboard
2. ทดสอบ build locally:
   ```bash
   npm run build
   ```
3. ตรวจสอบ Environment Variables

### Database Connection Error

1. ตรวจสอบ `DATABASE_URL` ใน Environment Variables
2. ใช้ Prisma Data Proxy หรือ Connection Pooling
3. ตรวจสอบว่า database server อนุญาต connection จาก Vercel IP

---

## 📚 เอกสารเพิ่มเติม

- [QUICK_DEPLOY_VERCEL.md](./QUICK_DEPLOY_VERCEL.md) - Deploy แบบเร็ว
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - คู่มือละเอียด
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) - Checklist

---

## 🎉 เสร็จแล้ว!

เมื่อทำตามขั้นตอนนี้ คุณจะ:
1. ✅ Push code ไป GitHub สำเร็จ
2. ✅ Deploy ไป Vercel สำเร็จ
3. ✅ ตั้งค่า Auto Deploy จาก GitHub

**Happy Deploying!** 🚀
