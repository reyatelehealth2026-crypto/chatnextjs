# 🚀 คู่มือตั้งค่า Prisma Accelerate (Step-by-Step)

> คู่มือละเอียดการตั้งค่า Prisma Accelerate สำหรับ Vercel Deployment

## 📋 สิ่งที่ต้องเตรียม

- [ ] Prisma Console account ([console.prisma.io](https://console.prisma.io))
- [ ] MySQL Database URL (จาก `.env.local`)
- [ ] Public IP ของ server (ถ้าใช้ direct connection)

---

## 🎯 ขั้นตอนที่ 1: ไปที่ Prisma Console

1. เปิด [console.prisma.io](https://console.prisma.io)
2. Login หรือ Sign up
3. สร้าง Project ใหม่ (ถ้ายังไม่มี)

---

## 🔧 ขั้นตอนที่ 2: ตั้งค่า Database Connection

### 2.1 ใส่ Direct Database URL

**จาก `.env.local` ของคุณ:**
```
DATABASE_URL="mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny"
```

**สำหรับ Prisma Accelerate:**
- ⚠️ **เปลี่ยน `localhost` เป็น public IP** ของ server
- หรือใช้ domain name (ถ้ามี)

**ตัวอย่าง:**
```
mysql://zrismpsz_cny:zrismpsz_cny@YOUR_SERVER_IP:3306/zrismpsz_cny
```

### 2.2 ตรวจสอบ Database Type

- ต้องเป็น **MySQL** (ไม่ใช่ PostgreSQL)
- ถ้าเห็น PostgreSQL connection string ให้เปลี่ยนเป็น MySQL

---

## ⚡ ขั้นตอนที่ 3: Enable Prisma Accelerate

### 3.1 เปิด Toggle

1. หา toggle switch **"Connect Prisma Accelerate"**
2. **เปิด toggle** (เปลี่ยนจาก OFF เป็น ON)
3. รอสักครู่ให้ Prisma ตั้งค่า

### 3.2 ตั้งค่า Region

- เลือก Region ที่ใกล้ที่สุด:
  - `ap-southeast-1` (Singapore) - แนะนำสำหรับไทย
  - `ap-northeast-1` (Tokyo)
  - `us-east-1` (Virginia)

---

## 🔑 ขั้นตอนที่ 4: Generate API Key

1. หลังเปิด Accelerate แล้ว จะมีปุ่ม **"Generate API Key"**
2. คลิกเพื่อสร้าง API Key
3. **Copy API Key** ที่ได้มา (เก็บไว้ให้ดี!)

---

## 📝 ขั้นตอนที่ 5: ได้ Connection String

หลัง Generate API Key แล้ว จะได้ connection string แบบนี้:

**สำหรับ MySQL:**
```
prisma+mysql://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```
หรือ
```
prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

**⚠️ สำคัญ**: 
- ถ้าเห็น `prisma+postgres://...` แสดงว่า Direct Database URL ยังเป็น PostgreSQL
- ต้องเปลี่ยน Direct Database URL เป็น MySQL ก่อน
- Connection string จะเปลี่ยนเป็น `prisma+mysql://...` หรือ `prisma://...` อัตโนมัติ

**Copy connection string นี้ไว้!**

---

## 💻 ขั้นตอนที่ 6: ติดตั้ง Extension ในโปรเจกต์

```bash
# 1. ไปที่โฟลเดอร์ inbox-nextjs
cd inbox-nextjs

# 2. ติดตั้ง Prisma Accelerate extension
npm install @prisma/extension-accelerate

# 3. Generate Prisma Client (พร้อม Accelerate)
npx prisma generate
```

### 📝 สร้างไฟล์ prisma.config.ts

ไฟล์ `prisma.config.ts` ถูกสร้างแล้ว! ไฟล์นี้ใช้สำหรับ:
- Prisma CLI operations (migrate, db push, db studio)
- ใช้ `DIRECT_DATABASE_URL` สำหรับ CLI
- Runtime ใช้ `DATABASE_URL` (Accelerate connection string)

**ตั้งค่า Environment Variables:**

ใน `.env.local` (สำหรับ local development):
```env
# Accelerate connection string (สำหรับ runtime)
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"

# Direct MySQL connection (สำหรับ Prisma CLI: migrate, db push, etc.)
DIRECT_DATABASE_URL="mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny"
```

ใน **Vercel Environment Variables**:
```env
# Accelerate connection string (สำหรับ runtime)
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"

# Direct MySQL connection (สำหรับ Prisma CLI - ใช้ public IP)
DIRECT_DATABASE_URL="mysql://zrismpsz_cny:zrismpsz_cny@YOUR_SERVER_IP:3306/zrismpsz_cny"
```

**สำคัญ:**
- `DATABASE_URL` = Accelerate connection string (สำหรับ runtime/application)
- `DIRECT_DATABASE_URL` = Direct MySQL connection (สำหรับ Prisma CLI operations)
- Prisma CLI (migrate, db push, db studio) ใช้ `DIRECT_DATABASE_URL`
- Application runtime ใช้ `DATABASE_URL` (Accelerate)

### ⚠️ หมายเหตุ: คำสั่งที่ Prisma Console แนะนำ

Prisma Console อาจแนะนำ:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**สำหรับโปรเจกต์นี้:**
- ✅ **ใช้**: `npx prisma generate` - Generate Prisma Client (ถูกต้อง)
- ❌ **ไม่ใช้**: `npx prisma migrate dev` - เพราะ database มีอยู่แล้วและมี schema อยู่แล้ว

**ถ้าต้องการ sync schema:**
```bash
# ใช้ db:push แทน (ไม่สร้าง migrations)
npx prisma db push
```

---

## ⚙️ ขั้นตอนที่ 7: ตั้งค่าใน Vercel

1. ไปที่ **Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**

2. เพิ่ม Environment Variable:
   - **Name**: `DATABASE_URL`
   - **Value**: connection string จาก Prisma Accelerate
     ```
     prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
     ```
   - **Environment**: Production (และ Preview ถ้าต้องการ)

3. **Save**

---

## ✅ ขั้นตอนที่ 8: Deploy และทดสอบ

```bash
# Deploy ไป Vercel
vercel --prod
```

### ตรวจสอบการเชื่อมต่อ

1. ไปที่ Vercel Dashboard → Logs
2. ตรวจสอบว่าไม่มี error เกี่ยวกับ database connection
3. ทดสอบเปิด URL ที่ Vercel ให้มา

---

## 🐛 แก้ไขปัญหา

### ปัญหา: "Connect Prisma Accelerate" toggle ไม่ทำงาน

**แก้ไข:**
1. ตรวจสอบว่าใส่ Direct Database URL ถูกต้อง
2. ตรวจสอบว่า database type เป็น MySQL
3. ลอง refresh หน้าเว็บ

### ปัญหา: Connection string เป็น PostgreSQL (`prisma+postgres://...`)

**สาเหตุ**: Direct Database URL ใน Prisma Console ยังเป็น PostgreSQL

**ตัวอย่างที่ผิด:**
```
prisma+postgres://accelerate.prisma-data.net/?api_key=...
```

**แก้ไข (Step-by-Step):**

1. **ไปที่ Prisma Console** → **Project Settings** (หรือ **Settings** → **Database**)

2. **หา "Direct Database URL"** หรือ **"Database Connection"**

3. **เปลี่ยน Direct Database URL เป็น MySQL:**
   
   **จาก `.env.local` ของคุณ:**
   ```
   mysql://zrismpsz_cny:zrismpsz_cny@localhost:3306/zrismpsz_cny
   ```
   
   **สำหรับ Prisma Accelerate ต้องเปลี่ยน `localhost` เป็น public IP:**
   ```
   mysql://zrismpsz_cny:zrismpsz_cny@YOUR_SERVER_IP:3306/zrismpsz_cny
   ```
   
   **⚠️ สำคัญ:**
   - ต้องขึ้นต้นด้วย `mysql://` (ไม่ใช่ `postgres://`)
   - ต้องใช้ **public IP** ของ server (ไม่ใช่ `localhost`)
   - Format: `mysql://USERNAME:PASSWORD@IP:PORT/DATABASE_NAME`

4. **Save** และรอให้ Prisma อัปเดต (อาจใช้เวลา 1-2 นาที)

5. **Refresh หน้าเว็บ** หรือกลับไปดู Accelerate connection string

6. **Connection string จะเปลี่ยนเป็น:**
   ```
   prisma+mysql://accelerate.prisma-data.net/?api_key=...
   ```
   หรือ
   ```
   prisma://accelerate.prisma-data.net/?api_key=...
   ```

7. **Copy connection string ใหม่** และใช้แทนตัวเดิม

**หมายเหตุ:** 
- Connection string เก่าที่เป็น `prisma+postgres://...` **ไม่สามารถใช้ได้** กับ MySQL database
- ต้องแก้ไข Direct Database URL ใน Prisma Console ก่อน

### ปัญหา: ไม่สามารถเชื่อมต่อ database

**แก้ไข:**
1. ตรวจสอบว่า Direct Database URL ใช้ public IP (ไม่ใช่ localhost)
2. ตรวจสอบว่า MySQL server อนุญาต connection จากภายนอก
3. ตรวจสอบ firewall settings

---

## 📋 Checklist

- [ ] สร้าง Prisma Console account
- [ ] สร้าง Project ใน Prisma Console
- [ ] ใส่ Direct Database URL (MySQL, ใช้ public IP)
- [ ] เปิด toggle "Connect Prisma Accelerate"
- [ ] Generate API Key
- [ ] Copy connection string (`prisma://...`)
- [ ] ติดตั้ง `@prisma/extension-accelerate`
- [ ] ตั้งค่า `DATABASE_URL` ใน Vercel
- [ ] Deploy และทดสอบ

---

## 📚 เอกสารเพิ่มเติม

- [DATABASE_CONNECTION_GUIDE.md](./DATABASE_CONNECTION_GUIDE.md) - คู่มือเชื่อมต่อ database
- [README_DEPLOY.md](./README_DEPLOY.md) - คู่มือ deploy สรุป
- [Prisma Accelerate Docs](https://www.prisma.io/docs/accelerate/getting-started)

---

🎉 **เมื่อทำตามขั้นตอนนี้ครบแล้ว คุณจะได้ Prisma Accelerate connection string พร้อมใช้งาน!**
