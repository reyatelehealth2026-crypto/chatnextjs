# คู่มือติดตั้งและ Deploy ระบบ Inbox

## สารบัญ
1. [ความต้องการระบบ](#1-ความต้องการระบบ)
2. [การติดตั้งสำหรับ Development](#2-การติดตั้งสำหรับ-development)
3. [การตั้งค่า Environment Variables](#3-การตั้งค่า-environment-variables)
4. [การ Deploy ผ่าน Vercel](#4-การ-deploy-ผ่าน-vercel)
5. [การตั้งค่า LINE Webhook](#5-การตั้งค่า-line-webhook)
6. [การสร้าง Admin User](#6-การสร้าง-admin-user)

---

## 1. ความต้องการระบบ

| รายการ | เวอร์ชันขั้นต่ำ |
|--------|---------------|
| Node.js | 18.x หรือสูงกว่า |
| npm | 9.x หรือสูงกว่า |
| PostgreSQL | 14.x หรือสูงกว่า |
| Git | 2.x |

### บริการที่ต้องมี:
- **PostgreSQL Database** - Prisma Data Platform, Supabase, Railway, หรือ self-hosted
- **LINE Messaging API** - สร้างได้ที่ [LINE Developers Console](https://developers.line.biz/)
- **Pusher** (Realtime) - สมัครฟรีได้ที่ [pusher.com](https://pusher.com)
- **Vercel Account** - สมัครฟรีได้ที่ [vercel.com](https://vercel.com)

---

## 2. การติดตั้งสำหรับ Development

### 2.1 Clone โปรเจค

```bash
git clone <repository-url>
cd inbox
```

### 2.2 ติดตั้ง Dependencies

```bash
npm install
```

### 2.3 สร้างไฟล์ `.env`

```bash
cp .env.example .env
```

### 2.4 Sync Database Schema

```bash
npx prisma db push
```

### 2.5 รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000

---

## 3. การตั้งค่า Environment Variables

สร้างไฟล์ `.env` และกรอกค่าต่อไปนี้:

### 3.1 Database

```env
# PostgreSQL Connection URL
DATABASE_URL="postgres://username:password@host:5432/database?sslmode=require"
DATABASE_DIRECT_URL="postgres://username:password@host:5432/database?sslmode=require"
```

> **วิธีขอ Database:**
> 1. ไปที่ [console.prisma.io](https://console.prisma.io)
> 2. สร้าง Project ใหม่
> 3. เลือก PostgreSQL
> 4. คัดลอก Connection URL มาใส่

### 3.2 NextAuth

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<สร้างด้วยคำสั่ง: openssl rand -base64 32>
```

**สำหรับ Production:** เปลี่ยน `NEXTAUTH_URL` เป็น domain จริง เช่น `https://your-app.vercel.app`

### 3.3 LINE Messaging API

```env
LINE_CHANNEL_ID=<Channel ID>
LINE_CHANNEL_SECRET=<Channel Secret>
LINE_ACCESS_TOKEN=<Channel Access Token>
```

> **วิธีขอ LINE Credentials:**
> 1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
> 2. สร้าง Provider → สร้าง Channel (Messaging API)
> 3. เข้าไปใน Channel → ดู Basic settings และ Messaging API tab

### 3.4 Pusher (Realtime)

```env
PUSHER_APP_ID=<App ID>
PUSHER_KEY=<Key>
PUSHER_SECRET=<Secret>
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=<Key>
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

> **วิธีขอ Pusher Credentials:**
> 1. ไปที่ [dashboard.pusher.com](https://dashboard.pusher.com)
> 2. สร้าง App ใหม่ → เลือก Cluster ใกล้ประเทศไทย (ap1)
> 3. ดู App Keys

### 3.5 Optional Settings

```env
# S3 Storage (สำหรับ upload ไฟล์)
S3_ENDPOINT=<endpoint>
S3_BUCKET=<bucket-name>
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_REGION=<region>

# Feature Flags
ENABLE_BROADCASTS=true
ENABLE_GROUPS=true
```

---

## 4. การ Deploy ผ่าน Vercel

### 4.1 Push โค้ดขึ้น GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 4.2 เชื่อมต่อ Vercel กับ GitHub

1. ไปที่ [vercel.com](https://vercel.com) และ Login
2. คลิก **"Add New..."** → **"Project"**
3. เลือก Repository ที่ต้องการ Deploy
4. เลือก **Framework Preset**: `Next.js`

### 4.3 ตั้งค่า Environment Variables บน Vercel

ในหน้า Configure Project ให้เพิ่ม Environment Variables ทุกตัว:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | *PostgreSQL URL* |
| `DATABASE_DIRECT_URL` | *PostgreSQL URL* |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | *ค่าที่ generate ไว้* |
| `LINE_CHANNEL_ID` | *LINE Channel ID* |
| `LINE_CHANNEL_SECRET` | *LINE Channel Secret* |
| `LINE_ACCESS_TOKEN` | *LINE Access Token* |
| `PUSHER_APP_ID` | *Pusher App ID* |
| `PUSHER_KEY` | *Pusher Key* |
| `PUSHER_SECRET` | *Pusher Secret* |
| `PUSHER_CLUSTER` | `ap1` |
| `NEXT_PUBLIC_PUSHER_KEY` | *Pusher Key* |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `ap1` |

### 4.4 Deploy

1. คลิก **"Deploy"**
2. รอ Build เสร็จ (ประมาณ 2-5 นาที)
3. เมื่อเสร็จจะได้ URL เช่น `https://inbox-xxx.vercel.app`

### 4.5 อัพเดท NEXTAUTH_URL

หลัง Deploy สำเร็จ:

1. ไปที่ **Settings** → **Environment Variables**
2. แก้ไข `NEXTAUTH_URL` ให้เป็น URL จริงของคุณ
3. คลิก **Redeploy** เพื่อใช้ค่าใหม่

---

## 5. การตั้งค่า LINE Webhook

### 5.1 คัดลอก Webhook URL

Webhook URL ของระบบคือ:
```
https://your-app.vercel.app/api/webhook/line
```

### 5.2 ตั้งค่าใน LINE Developers Console

1. ไปที่ LINE Developers Console
2. เข้า Channel ของคุณ → **Messaging API** tab
3. ในส่วน **Webhook settings**:
   - **Webhook URL**: ใส่ URL จากข้อ 5.1
   - **Use webhook**: เปิดใช้งาน
4. คลิก **Verify** เพื่อทดสอบการเชื่อมต่อ

### 5.3 ปิด Auto-reply (แนะนำ)

ในหน้า Messaging API:
- **Auto-reply messages**: ปิด
- **Greeting messages**: ปิด (หรือตั้งค่าตามต้องการ)

---

## 6. การสร้าง Admin User

### วิธีที่ 1: ผ่าน Setup API

เปิดเบราว์เซอร์ไปที่:
```
https://your-app.vercel.app/api/setup
```

จะได้ผลลัพธ์:
```json
{
  "success": true,
  "credentials": {
    "email": "admin@inbox.local",
    "password": "admin123"
  }
}
```

### วิธีที่ 2: ผ่าน Prisma Studio

```bash
npx prisma studio
```

สร้าง User ใหม่ โดยต้อง hash password ด้วย bcrypt ก่อน

---

## 7. ข้อมูล Login เริ่มต้น

| Field | Value |
|-------|-------|
| **URL** | `https://your-app.vercel.app/auth/signin` |
| **Email** | `admin@inbox.local` |
| **Password** | `admin123` |

> ⚠️ **สำคัญ:** เปลี่ยน password หลัง login ครั้งแรก!

---

## 8. เมนูหลักในระบบ

| เมนู | URL Path |
|------|----------|
| Dashboard | `/dashboard` |
| Inbox (แชท) | `/inbox` |
| Customers | `/inbox/customers` |
| Templates | `/inbox/templates` |
| Auto-Reply | `/inbox/auto-reply` |
| Broadcasts | `/inbox/broadcasts` |
| Segments | `/inbox/segments` |
| Groups | `/inbox/groups` |
| Analytics | `/inbox/analytics` |
| Settings | `/inbox/settings` |

---

## 9. Troubleshooting

### ปัญหา: Login ไม่ได้
- ตรวจสอบ `NEXTAUTH_URL` ให้ตรงกับ domain จริง
- ตรวจสอบ `NEXTAUTH_SECRET` ว่าถูก generate
- ลบ cookies แล้วลองใหม่

### ปัญหา: Database Connection Error
- ตรวจสอบ `DATABASE_URL` format
- ตรวจสอบ `sslmode=require` สำหรับ remote database
- รัน `npx prisma db push` อีกครั้ง

### ปัญหา: LINE Webhook ไม่ทำงาน
- ตรวจสอบว่า Webhook URL ถูกต้อง
- คลิก Verify ใน LINE Console
- ตรวจสอบ LINE credentials ใน .env

### ปัญหา: Realtime ไม่ทำงาน
- ตรวจสอบ Pusher credentials
- ตรวจสอบว่า `NEXT_PUBLIC_*` variables ถูกตั้งค่า

---

## 10. การอัพเดทระบบ

```bash
# Pull code ใหม่
git pull origin main

# ติดตั้ง dependencies ใหม่ (ถ้ามี)
npm install

# Sync database schema (ถ้ามีการเปลี่ยนแปลง)
npx prisma db push

# Vercel จะ auto-deploy เมื่อ push ไป GitHub
```

---

## ติดต่อสนับสนุน

หากพบปัญหาในการติดตั้ง กรุณาสร้าง Issue ใน GitHub Repository
