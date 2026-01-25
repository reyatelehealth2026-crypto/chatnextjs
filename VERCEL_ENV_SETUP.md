# การตั้งค่า Environment Variables ใน Vercel

## ปัญหา: 401 Unauthorized ใน `/api/sync/webhook`

ปัญหานี้เกิดจาก `INTERNAL_API_SECRET` ใน Vercel ไม่ตรงกับที่ใช้ใน `webhook.php`

## วิธีแก้ไข

### 1. ไปที่ Vercel Dashboard
1. เข้า https://vercel.com
2. เลือก Project: `inbox` (หรือชื่อ project ของคุณ)
3. ไปที่ **Settings** → **Environment Variables**

### 2. ตั้งค่า Environment Variables ต่อไปนี้:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `DATABASE_URL` | `mysql://zrismpsz_cny:zrismpsz_cny@118.27.146.16:3306/zrismpsz_cny` | **All Environments** |
| `NEXTAUTH_URL` | `https://inbox-iota-inky.vercel.app` | **All Environments** |
| `NEXTAUTH_SECRET` | `development-secret-key-change-in-production` | **All Environments** |
| `INTERNAL_API_SECRET` | `development-secret-key-change-in-production` | **All Environments** |

**สำคัญ:** `INTERNAL_API_SECRET` ต้องตรงกับค่าใน `webhook.php` (บรรทัด 214)

### 3. Redeploy

หลังจากตั้งค่า Environment Variables แล้ว:
1. ไปที่ **Deployments** tab
2. คลิก **...** (three dots) บน deployment ล่าสุด
3. เลือก **Redeploy**

หรือ push commit ใหม่เพื่อ trigger automatic deployment

## ตรวจสอบว่า Secret ตรงกัน

### ใน `webhook.php` (บรรทัด 214):
```php
$secret = 'development-secret-key-change-in-production';
```

### ใน Vercel:
`INTERNAL_API_SECRET` ต้องเป็นค่าเดียวกัน: `development-secret-key-change-in-production`

## หมายเหตุ

- **Production:** ควรเปลี่ยน secret เป็นค่าที่ปลอดภัยกว่า
- **Security:** อย่า commit secret จริงลงใน git repository
