# LINE CRM Pharmacy Inbox System

ระบบ Inbox แบบ Real-time สำหรับ LINE CRM Pharmacy พัฒนาด้วย Next.js 15, Prisma, และ NextAuth.js

> **หมายเหตุ**: ระบบนี้ออกแบบมาเพื่อทำงาน**ร่วมกับระบบ PHP เดิม** โดยใช้ database เดียวกัน
> และรันแยกต่างหากบน port 3000 ผ่าน Nginx reverse proxy

## ✨ Features

- 💬 **Real-time Chat** - ระบบแชทแบบ real-time ด้วย Server-Sent Events (SSE)
- 🔐 **Authentication** - ระบบ login ปลอดภัยด้วย NextAuth.js v5
- 👥 **Customer Management** - จัดการข้อมูลลูกค้าและประวัติการสนทนา
- 🏷️ **Auto-tagging** - ระบบแท็กอัตโนมัติตามเงื่อนไข
- 📱 **Responsive Design** - รองรับทั้ง Desktop และ Mobile
- ⚡ **Performance** - Optimized ด้วย TanStack Query และ Virtual Scrolling
- 🎨 **Modern UI** - ใช้ shadcn/ui และ Tailwind CSS

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MySQL + Prisma ORM
- **Authentication**: NextAuth.js v5
- **State Management**: Zustand + TanStack Query
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Real-time**: Server-Sent Events (SSE)

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm หรือ yarn

## 🛠️ Installation

> 🎯 **สำหรับ cny.re-ya.com:** อ่าน **[INSTALL_CNY.md](./INSTALL_CNY.md)** ⭐  
> 🎯 **ไม่เคยติดตั้ง Node.js มาก่อน?** เริ่มที่ **[START_HERE.md](./START_HERE.md)**

### Development

```bash
# Clone repository
git clone <repo-url>
cd inbox-nextjs

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# แก้ไข .env ตามต้องการ

# Generate Prisma Client
npm run db:generate

# Push database schema
npm run db:push

# Seed database
npm run db:seed

# Run development server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

**Login credentials**:
- Username: `admin`
- Password: `password123`

### Production (ติดตั้งร่วมกับระบบ PHP)

**🧙‍♂️ สำหรับผู้ที่ไม่เคยติดตั้ง Node.js มาก่อน:**
- ⭐ **[INSTALLATION_WIZARD.md](./INSTALLATION_WIZARD.md)** - คู่มือติดตั้งแบบละเอียดทีละขั้นตอน (แนะนำ!)
- 🤖 **`./install.sh`** - Installation Script อัตโนมัติ (รันคำสั่งเดียวเสร็จ)

**คู่มือเพิ่มเติม:**
- 🚀 **[QUICK_START.md](./QUICK_START.md)** - คู่มือเริ่มต้นแบบย่อ
- 📖 **[HYBRID_DEPLOYMENT.md](./HYBRID_DEPLOYMENT.md)** - คู่มือติดตั้งแบบละเอียด
- 🔗 **[INTEGRATION.md](./INTEGRATION.md)** - วิธีเชื่อมต่อกับ PHP
- 📋 **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - คำสั่งที่ใช้บ่อย
- 🐳 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - คู่มือ deploy แบบ standalone

## 📁 Project Structure

```
inbox-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   ├── auth/              # Authentication pages
│   │   └── inbox/             # Inbox pages
│   ├── components/            # React Components
│   │   ├── inbox/            # Inbox-specific components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                # Custom React Hooks
│   ├── lib/                  # Utilities & Services
│   │   └── services/         # Business logic services
│   ├── stores/               # Zustand stores
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data
├── scripts/                  # Utility scripts
│   ├── migrate-from-php.ts  # Migration script
│   └── test-auth.ts         # Auth testing
└── public/                   # Static files
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npm run db:generate     # Generate Prisma Client
npm run db:push         # Push schema to database
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio

# Migration
npx tsx scripts/migrate-from-php.ts  # Migrate from PHP system
```

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/pharmacy_inbox"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# LINE API
LINE_CHANNEL_ACCESS_TOKEN="your-token"
LINE_CHANNEL_SECRET="your-secret"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
```

## 📱 Features Overview

### 1. Conversation List
- แสดงรายการการสนทนาทั้งหมด
- Virtual scrolling สำหรับประสิทธิภาพ
- กรองตาม status, tags, assigned user
- ค้นหาด้วยชื่อหรือเบอร์โทร
- แสดงจำนวนข้อความที่ยังไม่ได้อ่าน

### 2. Chat Panel
- แสดงประวัติการสนทนา
- รองรับข้อความหลายประเภท (text, image, sticker, etc.)
- Typing indicators
- Reply to message
- Real-time updates

### 3. Customer Profile
- แสดงข้อมูลลูกค้า
- ประวัติการซื้อ
- จัดการ tags
- Membership level และ points

### 4. Auto-tagging System
- สร้างกฎการแท็กอัตโนมัติ
- รองรับหลาย trigger types
- Condition-based tagging
- Priority system

## 🧪 Testing

```bash
# Test authentication
npx tsx scripts/test-auth.ts

# Test database connection
npx prisma studio
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/callback/credentials` - Login
- `GET /api/auth/session` - Get session
- `POST /api/auth/signout` - Logout

### Inbox
- `GET /api/inbox/conversations` - Get conversations
- `GET /api/inbox/messages` - Get messages
- `POST /api/inbox/messages` - Send message
- `GET /api/inbox/tags` - Get tags
- `POST /api/inbox/tags` - Create tag
- `GET /api/inbox/realtime` - SSE endpoint

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Development Team - LINE CRM Pharmacy

## 🙏 Acknowledgments

- Next.js team
- Prisma team
- shadcn/ui
- All contributors

## 📞 Support

สำหรับคำถามหรือปัญหา กรุณาติดต่อ:
- Email: support@pharmacy.com
- LINE: @pharmacy-support
# inbox2 
