# 🏢 HR Pro Suite V3

> **Next-Gen HR OS** — ระบบบริหารทรัพยากรบุคคลครบวงจร สร้างด้วย Next.js 16 + Supabase (PostgreSQL) เป็น Backend

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Private-red)](#)

---

## 📋 สารบัญ

- [✨ ภาพรวม](#-ภาพรวม)
- [🧩 ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [🏗️ สถาปัตยกรรม](#️-สถาปัตยกรรม)
- [📂 โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [⚙️ การติดตั้งและเริ่มต้นใช้งาน](#️-การติดตั้งและเริ่มต้นใช้งาน)
- [🔧 Environment Variables](#-environment-variables)
- [📜 Scripts ที่มีให้ใช้งาน](#-scripts-ที่มีให้ใช้งาน)
- [🛠️ Tech Stack](#️-tech-stack)

---

## ✨ ภาพรวม

**HR Pro Suite V3** คือระบบบริหารทรัพยากรบุคคล (HRMS) แบบ Web Application ที่ออกแบบมาสำหรับธุรกิจ SME ถึงขนาดกลาง โดยใช้ **Google Sheets** เป็นฐานข้อมูลหลัก ทำให้ไม่ต้องตั้งค่า Database Server แยก — เพียงแค่มี Google Account ก็สามารถเริ่มใช้งานได้ทันที

เวอร์ชัน V3 ถูกเขียนใหม่ด้วยสถาปัตยกรรม **OOP (Object-Oriented Programming)** แบบ Layered Architecture เพื่อความเป็นระเบียบ ดูแลง่าย และขยายระบบได้ในอนาคต

---

## 🧩 ฟีเจอร์หลัก

### 👥 People Management
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **พนักงาน** | จัดการข้อมูลพนักงาน, สถานะ, ตำแหน่ง |
| **แผนก** | สร้างและจัดการโครงสร้างแผนก |
| **ตำแหน่ง** | กำหนดตำแหน่งงานและระดับ |
| **สรรหา** | ติดตามกระบวนการรับสมัครพนักงานใหม่ |

### ⏰ Time & Work
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **การเข้างาน** | ลงเวลาเข้า-ออก รองรับ GPS และ QR Code |
| **จัดกะ** | กำหนดกะการทำงาน |
| **การลา** | ระบบขอลาพร้อมโควต้า รองรับลาเต็มวัน/รายชั่วโมง |
| **โอที** | บันทึกและอนุมัติการทำงานล่วงเวลา |

### 💰 Money
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **เงินเดือน** | คำนวณ Payroll, ดึงข้อมูลวันลา/OT อัตโนมัติ |
| **สวัสดิการ** | จัดการสวัสดิการพนักงาน |
| **ประกันสังคม** | คำนวณเงินสมทบประกันสังคม |
| **เงินกู้/เบิกล่วงหน้า** | ระบบเบิกเงินล่วงหน้าและเงินกู้ |
| **เบิกค่าใช้จ่าย** | เบิกจ่ายค่าใช้จ่ายต่างๆ |

### 📈 Growth
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **อบรม** | วางแผนและติดตามหลักสูตรอบรม |
| **ปฐมนิเทศ** | กระบวนการ Onboarding พนักงานใหม่ |
| **ประเมินผล** | ประเมินผลงาน KPI |
| **รางวัล** | ระบบรางวัลและเชิดชูพนักงาน |
| **ประกาศ** | ระบบประกาศข่าวภายในองค์กร |
| **ทริปบริษัท** | จัดการทริปและกิจกรรมบริษัท |
| **จัดประชุม** | จัดการห้องประชุมและวาระ |

### 🔧 Operations & System
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **ทรัพย์สิน** | จัดการอุปกรณ์และทรัพย์สินบริษัท |
| **เอกสาร** | จัดเก็บเอกสารสำคัญ |
| **เดินทางธุรกิจ** | บันทึกการเดินทางไปทำธุรกิจ |
| **วินัย** | บันทึกการลงโทษทางวินัย |
| **ลาออก** | กระบวนการลาออกและ Offboarding |
| **รายงาน** | Dashboard และรายงานสรุป |
| **LINE OA** | เชื่อมต่อ LINE Official Account |
| **ตั้งค่าระบบ** | การตั้งค่าทั่วไป, สิทธิ์, และ Geofence |

---

## 🏗️ สถาปัตยกรรม

โปรเจกต์ใช้ **Layered Architecture (OOP)** แบ่งเป็น 4 ชั้น:

```
┌─────────────────────────────────────────────┐
│              🖥️  App Layer                  │
│         (Next.js Pages & API Routes)        │
├─────────────────────────────────────────────┤
│            🎮  Controllers                  │
│   Request validation, response formatting   │
├─────────────────────────────────────────────┤
│            ⚙️  Services                     │
│      Business logic & domain rules          │
├─────────────────────────────────────────────┤
│            💾  Repositories                 │
│       Data access (Google Sheets)           │
├─────────────────────────────────────────────┤
│         🏗️  Infrastructure                  │
│   GoogleSheetsClient, CacheManager          │
└─────────────────────────────────────────────┘
```

| Layer | ตำแหน่ง | หน้าที่ |
|-------|---------|--------|
| **Models** | `lib/models/` | TypeScript interfaces สำหรับทุก entity |
| **Infrastructure** | `lib/infrastructure/` | Google Sheets Client, Cache Manager |
| **Repositories** | `lib/repositories/` | CRUD operations กับ Google Sheets |
| **Services** | `lib/services/` | Business logic (Auth, Payroll, Geofence ฯลฯ) |
| **Controllers** | `lib/controllers/` | จัดการ Request/Response ของ API Routes |

---

## 📂 โครงสร้างโปรเจกต์

```
hr-pro-suite/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (30 modules)
│   │   ├── employees/            
│   │   ├── attendance/           
│   │   ├── leave/                
│   │   ├── payroll/              
│   │   └── ...                   
│   ├── employees/                # หน้า UI แต่ละโมดูล
│   ├── attendance/               
│   ├── leave/                    
│   ├── payroll/                  
│   ├── login/                    
│   ├── ClientLayout.tsx          # Layout หลัก (Sidebar, Topbar)
│   ├── page.tsx                  # หน้า Dashboard
│   ├── layout.tsx                # Root Layout
│   └── globals.css               
├── lib/                          # Business Logic (OOP)
│   ├── models/                   # Domain Models (TypeScript Interfaces)
│   ├── infrastructure/           # GoogleSheetsClient, CacheManager
│   ├── repositories/             # BaseRepository (CRUD)
│   ├── services/                 # Business Services
│   │   ├── AuthService.ts        
│   │   ├── PayrollService.ts     
│   │   ├── GeofenceService.ts    
│   │   └── ...                   
│   ├── controllers/              # API Controllers
│   │   ├── BaseController.ts     
│   │   ├── EmployeeController.ts 
│   │   ├── AttendanceController.ts
│   │   └── ...                   
│   ├── googleSheets.ts           # Sheet connection utilities
│   ├── sheetManager.ts           # Multi-sheet management
│   ├── permissions.ts            # Role-based permissions
│   └── navModules.ts             # Navigation config
├── scripts/                      # Setup & Migration Scripts
│   ├── setup-sheets.js           # สร้าง Sheet ทั้งหมดอัตโนมัติ
│   ├── setup-attendance.js       # ตั้งค่าระบบ Attendance
│   ├── seed-demo.js              # ข้อมูลตัวอย่าง Demo
│   └── seed-users.js             # สร้างผู้ใช้เริ่มต้น
├── public/                       # Static assets
├── patches/                      # Dependency patches
├── .env.local.example            # ตัวอย่าง Environment Variables
├── package.json                  
├── tsconfig.json                 
└── next.config.ts                
```

---

## ⚙️ การติดตั้งและเริ่มต้นใช้งาน

### ข้อกำหนดเบื้องต้น

- **Node.js** 18+ (แนะนำ 20+)
- **Google Account** พร้อม Service Account Key (JSON)
- **Google Sheets** ที่แชร์สิทธิ์ให้ Service Account

### ขั้นตอนการติดตั้ง

```bash
# 1. Clone โปรเจกต์
git clone https://github.com/Gugame56/hr-pro-suite-V2-.git
cd hr-pro-suite

# 2. ติดตั้ง Dependencies
npm install

# 3. สร้างไฟล์ Environment Variables
cp .env.local.example .env.local
# จากนั้นแก้ไขค่าต่างๆ ในไฟล์ .env.local (ดูรายละเอียดด้านล่าง)

# 4. สร้าง Sheet ทั้งหมดใน Google Sheets (26 Sheets)
npm run setup-sheets

# 5. ตั้งค่าระบบ Attendance
npm run setup-attendance

# 6. (ทางเลือก) ใส่ข้อมูลตัวอย่าง Demo
node scripts/seed-demo.js

# 7. เริ่มต้น Development Server
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 🔧 Environment Variables

สร้างไฟล์ `.env.local` ในโฟลเดอร์หลักของโปรเจกต์:

```env
# Google Sheets Service Account
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=your_spreadsheet_id_here

# Google Maps (สำหรับแสดงแผนที่สำนักงาน — ฝั่ง Client)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key

# Google Places (สำหรับค้นหาสถานที่ — ฝั่ง Server)
GOOGLE_PLACES_API_KEY=your_places_api_key
```

> **⚠️ สำคัญ:** อย่า commit ไฟล์ `.env.local` ขึ้น Git — ไฟล์นี้ถูก ignore ไว้แล้วใน `.gitignore`

---

## 📜 Scripts ที่มีให้ใช้งาน

| คำสั่ง | รายละเอียด |
|--------|-----------|
| `npm run dev` | เริ่ม Development Server (Turbopack) |
| `npm run build` | Build สำหรับ Production (Webpack) |
| `npm run start` | รัน Production Server |
| `npm run lint` | ตรวจสอบ Code ด้วย ESLint |
| `npm run setup-sheets` | สร้าง Sheet ทั้งหมดใน Google Sheets |
| `npm run setup-attendance` | ตั้งค่า Attendance Sheet |
| `node scripts/seed-demo.js` | ใส่ข้อมูลตัวอย่าง Demo |
| `node scripts/seed-users.js` | สร้าง User เริ่มต้น |

---

## 🛠️ Tech Stack

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| **Next.js** | 16.2 | React Framework (App Router) |
| **React** | 19.2 | UI Library |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Google Sheets API** | googleapis v172 | Database Backend |
| **Recharts** | 3.8 | Data Visualization |
| **Lucide React** | 1.16 | Icon Library |

---

## 🔑 สิทธิ์ผู้ใช้ (Roles)

ระบบรองรับ Role-based Access Control:

| Role | สิทธิ์ |
|------|-------|
| **superadmin** | สิทธิ์สูงสุด — เข้าถึงทุกฟีเจอร์และตั้งค่าระบบ |
| **admin** | จัดการพนักงาน, อนุมัติคำขอ, ดูรายงาน |
| **manager** | ดูแลทีม, อนุมัติการลา/OT ของลูกทีม |
| **employee** | ดูข้อมูลตัวเอง, ส่งคำขอลา, ลงเวลา |

---

## 📄 เอกสารเพิ่มเติม

- 📘 [คู่มือการตั้งค่า Google Sheets](./SETUP_GUIDE.md) — ขั้นตอนละเอียดในการเชื่อมต่อ Google Sheets

---

## 🤝 การมีส่วนร่วม

1. Fork โปรเจกต์
2. สร้าง Branch ใหม่ (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไปยัง Branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

---

<p align="center">
  สร้างด้วย ❤️ โดยทีม HR Pro Suite
</p>
