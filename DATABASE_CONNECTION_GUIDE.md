# 🔌 คู่มือการเชื่อมต่อ Database จาก Vercel

> วิธีเชื่อมต่อ MySQL database จาก Vercel ไปยัง server ของคุณ

## ⚠️ ปัญหาที่พบบ่อย

**Vercel ใช้ Dynamic IP Addresses** - IP address ของ Vercel serverless functions เปลี่ยนตลอดเวลา  
**ดังนั้น**: การ whitelist IP ใน cPanel "Remote Database Access" **จะไม่ทำงาน** เพราะ IP เปลี่ยนทุกครั้ง

---

## ✅ วิธีที่แนะนำ: ใช้ Prisma Accelerate (แนะนำที่สุด) ⭐

### ขั้นตอนที่ 1: สร้าง Prisma Accelerate Account

1. **ไปที่ Prisma Console**
   - เปิด [console.prisma.io](https://console.prisma.io)
   - Login หรือ Sign up

2. **สร้าง Project**
   - คลิก **"New Project"**
   - ตั้งชื่อ project (เช่น `inbox-nextjs`)

3. **Enable Accelerate**
   - เลือก Environment (Production)
   - เปิด toggle **"Connect Prisma Accelerate"** (สำคัญ!)
   - ใส่ **Direct Database URL** ของคุณ (MySQL):
     ```
     mysql://USERNAME:PASSWORD@YOUR_SERVER_IP:3306/DATABASE_NAME
     ```
     **ตัวอย่างจาก .env.local:**
     ```
     mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny
     ```
     **⚠️ สำหรับ Vercel**: เปลี่ยน `localhost` เป็น **public IP** ของ server
   - เลือก Region ที่ใกล้ที่สุด (เช่น `ap-southeast-1` สำหรับไทย)

4. **Generate API Key**
   - คลิก **"Generate API Key"**
   - Copy API Key ที่ได้มา (เก็บไว้ให้ดี!)

5. **ได้ Connection String**
   - จะได้ connection string แบบนี้:
     ```
     prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
     ```

### ขั้นตอนที่ 2: ติดตั้ง Prisma Accelerate Extension

```bash
# 1. ติดตั้ง extension
npm install @prisma/extension-accelerate

# 2. Generate Prisma Client
npx prisma generate
```

### ขั้นตอนที่ 3: ตั้งค่าใน Vercel

1. ไปที่ Vercel Dashboard → Environment Variables
2. เพิ่ม `DATABASE_URL` ด้วย connection string จาก Prisma Accelerate:
   ```
   DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
   ```

### ขั้นตอนที่ 4: อัปเดต Code (ถ้าจำเป็น)

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate())
```

### ข้อดี:
- ✅ ไม่ต้อง whitelist IP
- ✅ Connection pooling อัตโนมัติ
- ✅ ปลอดภัย
- ✅ รองรับ serverless functions

---

## 🔄 วิธีที่ 2: ใช้ Connection Pooling Service

### ตัวเลือก A: PlanetScale

```bash
# 1. สร้าง account ที่ PlanetScale
# 2. สร้าง database
# 3. ใช้ connection string ที่ PlanetScale ให้มา
DATABASE_URL="mysql://USER:PASS@HOST:3306/DB?sslaccept=strict"
```

### ตัวเลือก B: Railway

```bash
# 1. สร้าง account ที่ Railway
# 2. สร้าง MySQL database
# 3. ใช้ connection string ที่ Railway ให้มา
```

---

## ⚠️ วิธีที่ 3: Direct Connection (ไม่แนะนำ)

### ถ้าจำเป็นต้องใช้ Direct Connection:

#### ขั้นตอนที่ 1: หา Public IP ของ Server

```bash
# ตรวจสอบ public IP ของ server
curl ifconfig.me
# หรือ
curl ipinfo.io/ip
```

#### ขั้นตอนที่ 2: ตั้งค่า MySQL ให้รับ connection จากภายนอก

**ใน cPanel:**
1. ไปที่ **Remote MySQL** (ไม่ใช่ Remote Database Access)
2. เพิ่ม `%` เพื่ออนุญาต connection จากทุก IP (⚠️ เสี่ยงด้านความปลอดภัย)

**หรือใน MySQL config:**
```bash
# แก้ไข /etc/mysql/my.cnf
bind-address = 0.0.0.0

# Restart MySQL
sudo systemctl restart mysql
```

#### ขั้นตอนที่ 3: ตั้งค่า Firewall

```bash
# เปิด port 3306
sudo ufw allow 3306/tcp
```

#### ขั้นตอนที่ 4: ตั้งค่า DATABASE_URL ใน Vercel

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@YOUR_SERVER_IP:3306/DATABASE_NAME?connection_limit=10"
```

### ⚠️ ข้อเสีย:
- ❌ เสี่ยงด้านความปลอดภัย (เปิด MySQL port ให้ public)
- ❌ Vercel serverless functions มี connection limit
- ❌ อาจมีปัญหา connection timeout
- ❌ ต้องจัดการ firewall และ security เอง

---

## 🎯 สรุป: วิธีไหนดีที่สุด?

| วิธี | ความปลอดภัย | ความง่าย | ราคา | แนะนำ |
|------|------------|---------|------|-------|
| **Prisma Data Proxy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 💰 (มี free tier) | ✅ **แนะนำที่สุด** |
| **Connection Pooling** | ⭐⭐⭐⭐ | ⭐⭐⭐ | 💰 (มี free tier) | ✅ แนะนำ |
| **Direct Connection** | ⭐⭐ | ⭐⭐ | ฟรี | ❌ ไม่แนะนำ |

---

## 📝 ขั้นตอนสรุป (แนะนำ)

### ใช้ Prisma Accelerate:

1. **ไปที่ Prisma Console**
   - เปิด [console.prisma.io](https://console.prisma.io)
   - Login หรือ Sign up

2. **สร้าง Project และ Enable Accelerate**
   - สร้าง Project ใหม่
   - Enable Accelerate
   - ใส่ Direct Database URL ของคุณ
   - Generate API Key

3. **ติดตั้ง Extension**
   ```bash
   npm install @prisma/extension-accelerate
   npx prisma generate
   ```

4. **Copy connection string** จาก Prisma Console
   - Format: `prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY`

5. **ตั้งค่าใน Vercel Dashboard**
   - ไปที่ Project → Settings → Environment Variables
   - เพิ่ม `DATABASE_URL` = connection string จาก Prisma

6. **Deploy**
   ```bash
   vercel --prod
   ```

---

## 🔍 ตรวจสอบการเชื่อมต่อ

### ทดสอบ Database Connection

```bash
# ใช้ Vercel CLI
vercel env pull .env.local
npm run db:studio
```

### ตรวจสอบ Logs

```bash
# ดู logs ใน Vercel Dashboard
# หรือใช้ CLI
vercel logs
```

---

## 🐛 แก้ไขปัญหา

### "Cannot connect to database"

1. ตรวจสอบ `DATABASE_URL` ใน Environment Variables
2. ตรวจสอบว่าใช้ Prisma Data Proxy หรือ Connection Pooling
3. ตรวจสอบ logs ใน Vercel Dashboard

### "Connection timeout"

- ใช้ Prisma Data Proxy (มี connection pooling)
- หรือเพิ่ม `?connection_limit=10` ใน connection string

---

## 📚 เอกสารเพิ่มเติม

- [Prisma Data Proxy Documentation](https://www.prisma.io/docs/data-platform/accelerate)
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - คู่มือ deploy ละเอียด
- [README_DEPLOY.md](./README_DEPLOY.md) - คู่มือสรุป

---

## ✅ Checklist

- [ ] เลือกวิธีเชื่อมต่อ (แนะนำ: Prisma Data Proxy)
- [ ] ตั้งค่า Prisma Accelerate หรือ Connection Pooling
- [ ] ตั้งค่า `DATABASE_URL` ใน Vercel Environment Variables
- [ ] ทดสอบการเชื่อมต่อ
- [ ] Deploy และตรวจสอบ logs

---

🎉 **เมื่อตั้งค่าเสร็จแล้ว คุณจะสามารถเชื่อมต่อ database จาก Vercel ได้สำเร็จ!**
