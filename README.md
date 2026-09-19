# 🏢 HR Pro Suite V2

> **Enterprise Human Resource Management System (HRMS)**
> ระบบบริหารจัดการทรัพยากรบุคคลแบบครบวงจร พัฒนาด้วย **Next.js + TypeScript + Tailwind CSS** และใช้ **Google Sheets API** เป็น Data Store

---

## 📌 ภาพรวมโปรเจกต์

**HR Pro Suite V2** คือระบบบริหารจัดการทรัพยากรบุคคลแบบ **All-in-One HRMS** ที่ออกแบบมาเพื่อรองรับกระบวนการทำงานของฝ่าย HR ตั้งแต่การจัดการข้อมูลพนักงาน การลงเวลา การลา เงินเดือน ไปจนถึงการประเมินผลและการออกเอกสาร

ระบบถูกออกแบบด้วยแนวคิด **Clean Architecture / Layered Architecture** เพื่อให้แต่ละส่วนมีหน้าที่ชัดเจน แยก Business Logic ออกจาก Data Access และ Infrastructure ทำให้ระบบสามารถพัฒนาและดูแลต่อได้ง่าย

### 🧩 Technology Overview

| ส่วนประกอบ               | เทคโนโลยี                            |
| ------------------------ | ------------------------------------ |
| 🖥️ Frontend / Framework | Next.js — App Router                 |
| 💻 Programming Language  | TypeScript                           |
| 🎨 UI / Styling          | Tailwind CSS                         |
| 🗄️ Database / Storage   | Google Sheets API v4                 |
| ⚡ Caching                | In-Memory Cache Manager              |
| 🔐 Authentication        | Custom JWT / Session                 |
| 🛡️ Authorization        | RBAC                                 |
| 📍 Location              | Google Places API / GPS / Geofencing |
| 💬 Integration           | LINE OA                              |

---

# 🌟 Core Features

ระบบครอบคลุมกระบวนการ HR มากกว่า **20 โมดูล** โดยแบ่งออกเป็นส่วนสำคัญดังนี้

### 1️⃣ Dashboard & Overview

📊 **`/app/page.tsx`**

* ภาพรวมข้อมูลพนักงาน
* สถิติการเข้างาน
* สถิติการลา
* ข้อมูลสำคัญสำหรับผู้บริหารและฝ่าย HR

---

### 2️⃣ 👥 Employee Management

**`/employees` · `/departments` · `/positions`**

* 👤 ข้อมูลส่วนตัวพนักงาน
* 🏢 ข้อมูลแผนก
* 💼 ตำแหน่งงาน
* 📋 ประวัติการทำงาน
* 🗂️ โครงสร้างองค์กร / Organization Chart

---

### 3️⃣ ⏰ Attendance & Work Shifts

**`/attendance` · `/shifts`**

รองรับระบบบันทึกเวลาและการจัดการกะการทำงาน

* 🕐 บันทึกเวลาเข้า–ออกงาน
* 📍 ตรวจสอบ GPS / Geofencing
* 🏢 ตรวจสอบว่าพนักงานอยู่ภายในรัศมีบริษัทหรือไม่
* 🔄 จัดการ Work Shifts

---

### 4️⃣ 🏖️ Leave Management

**`/leave` · `/leave-types`**

* 📝 ยื่นคำขอลา
* ✅ ระบบอนุมัติการลา
* 📊 คำนวณวันลาคงเหลือ
* ⚙️ กำหนดประเภทการลา
* 🔐 กำหนดสิทธิ์และเงื่อนไขการลา

---

### 5️⃣ 🚗 Overtime & Business Trips

**`/overtime` · `/business-trips` · `/company-trips`**

* ⏱️ คำนวณ OT
* 💰 ขออนุมัติเบี้ยเลี้ยง
* ✈️ จัดการการเดินทางไปปฏิบัติงาน
* 📋 ติดตามสถานะคำขอ

---

### 6️⃣ 💰 Payroll & Benefits

**`/payroll` · `/benefits` · `/loans` · `/social-security`**

ระบบจัดการค่าตอบแทนและสวัสดิการ

* 💵 คำนวณเงินเดือน
* 🧾 คำนวณภาษี
* 🏥 คำนวณประกันสังคม
* 🔄 Sync ข้อมูลขาด / ลา / มาสาย / OT
* 💳 จัดการเงินกู้ยืมพนักงาน
* 🎁 จัดการสวัสดิการ

---

### 7️⃣ 📈 Performance & Development

**`/evaluations` · `/training` · `/rewards` · `/discipline`**

* 🎯 KPI / Performance Evaluation
* 📚 ประวัติการอบรม
* ⚠️ บันทึกมาตรการทางวินัย
* 📄 หนังสือเตือน
* 🏆 ระบบรางวัลและการยกย่อง

---

### 8️⃣ 🧑‍💼 Recruitment & Offboarding

**`/recruitment` · `/onboarding` · `/resignations`**

* 🔎 ติดตามกระบวนการ Recruitment
* 📋 Onboarding Checklist
* 👋 กระบวนการลาออก
* 📦 Offboarding Process

---

### 9️⃣ 📄 Documents & Certificates

**`/documents`**

รองรับการออกเอกสาร HR เช่น

* 💰 Salary Certificate
* 💼 Employment Certificate
* 📄 เอกสารรับรองอื่น ๆ

---

### 🔟 🔐 Security & Audit

**`/settings` · `/lib/audit.ts`**

* 🛡️ Role-Based Access Control (RBAC)
* 🔑 Authentication / Authorization
* 📝 Audit Logs
* 🔍 ตรวจสอบประวัติการเปลี่ยนแปลงข้อมูล

---

# 🏗️ System Architecture

ระบบใช้แนวคิด **Layered Architecture (N-Tier)** เพื่อแยกความรับผิดชอบของแต่ละ Layer อย่างชัดเจน

```text
┌───────────────────────────────────────┐
│       🖥️ Client / React UI            │
│          Browser                      │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 🌐 Presentation Layer                 │
│ Next.js API Routes — app/api/*       │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 🎛️ Controller Layer                   │
│ lib/controllers/*                     │
│ BaseController / EmployeeController  │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 🧠 Service Layer                      │
│ lib/services/*                        │
│ Business Logic / Payroll / Geofence   │
│ Audit                                  │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 🗂️ Repository Layer                   │
│ lib/repositories/*                    │
│ CRUD / Data Mapping                   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ ⚙️ Infrastructure Layer               │
│ lib/infrastructure/*                  │
│ GoogleSheetsClient / CacheManager     │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│ 📊 Google Sheets API                  │
│ External Data Storage                 │
└───────────────────────────────────────┘
```

---

# 🛠️ Tech Stack

### 🖥️ Application

* **Next.js** — App Router
* **TypeScript**
* **Tailwind CSS**

### 🗄️ Data & Storage

* **Google Sheets API v4**
* In-Memory Cache Manager

### 🔐 Authentication & Security

* Custom JWT / Session
* RBAC Guard
* `lib/apiGuard.ts`
* `lib/permissions.ts`

### 🔗 External Integration

* Google Places API
* LINE OA Integration

---

# 📁 Project Structure

```text
HR-Pro-Suite-V2/
│
├── 📁 app/
│   ├── 📁 api/
│   │   └── REST API Routes
│   │
│   ├── 📁 attendance/
│   │   └── หน้าบันทึกเวลา
│   │
│   ├── 📁 employees/
│   │   └── หน้าจัดการพนักงาน
│   │
│   ├── 📁 payroll/
│   │   └── หน้าคำนวณเงินเดือน
│   │
│   └── .../
│       └── โมดูล UI อื่น ๆ
│
├── 📁 lib/
│   │
│   ├── 📁 controllers/
│   │   ├── BaseController.ts
│   │   ├── EmployeeController.ts
│   │   └── ...
│   │
│   ├── 📁 repositories/
│   │   └── BaseRepository.ts
│   │
│   ├── 📁 services/
│   │   ├── AuthService.ts
│   │   ├── PayrollService.ts
│   │   ├── GeofenceService.ts
│   │   └── AuditService.ts
│   │
│   ├── 📁 infrastructure/
│   │   ├── GoogleSheetsClient.ts
│   │   └── CacheManager.ts
│   │
│   ├── 📁 models/
│   │   └── TypeScript Interfaces / Entities
│   │
│   └── .../
│       └── Utilities
│
├── 📁 scripts/
│   ├── setup-sheets.js
│   ├── seed-users.js
│   └── seed-demo.js
│
└── 📄 SETUP_GUIDE.md
```

---

# 🚀 Getting Started

## 1️⃣ Prerequisites

ก่อนเริ่มต้นใช้งาน ตรวจสอบว่ามีสิ่งต่อไปนี้

* 🟢 Node.js **18.x หรือสูงกว่า**
* ☁️ Google Cloud Platform Account
* 📊 เปิดใช้งาน **Google Sheets API**
* 🔑 Service Account Credentials — JSON File

---

## 2️⃣ 📦 Install Dependencies

```bash
npm install
```

---

## 3️⃣ 🔐 Environment Variables

สร้างไฟล์ `.env.local` ที่ Root Directory

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"

GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

GOOGLE_SHEET_ID="your_google_sheet_id_here"

JWT_SECRET="your-super-secret-jwt-key"
```

> ⚠️ **Security Note:** ห้าม Commit ไฟล์ `.env.local` หรือ Private Key ขึ้น Git Repository

---

## 4️⃣ 📊 Setup Google Sheets

### สร้าง Sheet และ Header

```bash
node scripts/setup-sheets.js
```

### 👤 สร้างผู้ใช้เริ่มต้น

```bash
node scripts/seed-users.js
```

### 🧪 สร้างข้อมูล Demo

```bash
node scripts/seed-demo.js
```

---

## 5️⃣ ▶️ Run Development Server

```bash
npm run dev
```

จากนั้นเปิด Browser ที่

```text
http://localhost:3000
```

---

# 🧠 System Workflow

## 🔄 Request → Response Lifecycle

การทำงานของระบบตั้งแต่ผู้ใช้เริ่มทำรายการจนได้รับผลลัพธ์

### 1️⃣ Client Trigger

ผู้ใช้ทำรายการผ่านหน้าเว็บ เช่น

* ⏰ Check-in ที่ `/attendance`
* 🏖️ ขออนุมัติลาที่ `/leave`

### 2️⃣ 🌐 API Route Entry

Request ถูกส่งเข้าสู่ Next.js API Route เช่น

```text
app/api/attendance/route.ts
```

### 3️⃣ 🎛️ Controller Handling

API Route เรียกใช้งาน Controller เช่น

```text
AttendanceController
```

จากนั้น Controller จะเรียก `apiGuard.ts` เพื่อตรวจสอบ

* 🔑 Authorization Token
* 👤 User Role
* 🛡️ Permission

### 4️⃣ 🧠 Service Execution

Controller ส่งข้อมูลต่อไปยัง Service ที่เกี่ยวข้อง

ตัวอย่าง:

```text
GeofenceService
```

ใช้ตรวจสอบระยะห่างระหว่างพนักงานกับบริษัทด้วย GPS

หรือ

```text
PayrollService
```

ใช้คำนวณ

* เงินเดือน
* ภาษี
* ประกันสังคม
* ขาดงาน
* ลา
* มาสาย
* OT

### 5️⃣ 🗂️ Repository & Infrastructure

Service ติดต่อกับ Repository

```text
Service
   ↓
Repository
   ↓
GoogleSheetsClient
   ↓
Google Sheets API
```

โดยมี `CacheManager` ช่วยลดการเรียก Google Sheets API และป้องกันปัญหา **Rate Limit / Quota Exceeded**

### 6️⃣ 📝 Audit & Response

เมื่อดำเนินการสำเร็จ

```text
AuditService
      ↓
บันทึก Log
      ↓
Controller
      ↓
JSON Response
      ↓
Frontend
```

---

# 🧱 OOP Concepts in Action

โปรเจกต์นี้ใช้ **Object-Oriented Programming (OOP)** เป็นแนวทางหลักในการออกแบบ Backend ภายใน `lib/`

โดยมีหลักการสำคัญ 4 ส่วน

---

## 1️⃣ Inheritance — การสืบทอด

ใช้เพื่อลดการเขียน Code ซ้ำตามหลัก

> **DRY — Don't Repeat Yourself**

### 🎛️ BaseController

ไฟล์:

```text
lib/controllers/BaseController.ts
```

ทำหน้าที่เป็น Parent Class สำหรับ Controller ต่าง ๆ

ตัวอย่าง Method:

```typescript
sendSuccess(data, message)

sendError(error, statusCode)

validateRequest(schema, body)
```

### 👶 Child Controllers

```typescript
EmployeeController extends BaseController

AttendanceController extends BaseController

LeaveController extends BaseController

AuthController extends BaseController
```

ทำให้ Controller ลูกสามารถนำ Function มาตรฐานจาก `BaseController` มาใช้งานได้ทันที

---

### 🗂️ BaseRepository

ไฟล์:

```text
lib/repositories/BaseRepository.ts
```

เป็น Parent Class สำหรับ Data Access

รองรับ CRUD เช่น

```typescript
findAll()

findById(id)

create(data)

update(id, data)

delete(id)
```

Repository ของแต่ละ Module สามารถนำ Function พื้นฐานเหล่านี้ไปใช้ต่อได้

---

# 2️⃣ 🎭 Abstraction — การซ่อนรายละเอียด

Abstraction คือการซ่อนความซับซ้อนภายในระบบ และเปิดให้ส่วนอื่นเรียกใช้งานผ่าน Method ที่เข้าใจง่าย

### 📊 GoogleSheetsClient

ไฟล์:

```text
lib/infrastructure/GoogleSheetsClient.ts
```

ซ่อนรายละเอียดของ Google Sheets API เช่น

* A1 Notation
* Range
* Authentication
* Service Account
* Row / Column Mapping
* Google API SDK

ส่วนอื่นของระบบไม่จำเป็นต้องรู้รายละเอียดภายใน

สามารถเรียกง่าย ๆ เช่น

```typescript
sheetsClient.readRows(sheetName)

sheetsClient.appendRow(sheetName, values)
```

---

### 📍 GeofenceService

ไฟล์:

```text
lib/services/GeofenceService.ts
```

ซ่อนการคำนวณระยะทางด้วย **Haversine Formula**

ภายนอกสามารถเรียกเพียง

```typescript
geofenceService.isWithinRadius(
  userLat,
  userLng,
  officeLat,
  officeLng,
  allowedRadiusMeters
)
```

โดยไม่ต้องรู้ว่าภายในมีการคำนวณทางคณิตศาสตร์อย่างไร

---

# 3️⃣ 🔒 Encapsulation — การห่อหุ้มข้อมูล

Encapsulation ใช้สำหรับป้องกัน Internal State ของ Object ไม่ให้ถูกแก้ไขโดยตรงจากภายนอก

### ⚡ CacheManager

ไฟล์:

```text
lib/infrastructure/CacheManager.ts
```

ตัวอย่างข้อมูลภายใน:

```typescript
private cache: Map<string, CacheEntry>
```

และค่า TTL จะถูกเก็บเป็น Internal State

การเข้าถึงทำผ่าน Public Methods เช่น

```typescript
get(key)

set(key, value, ttl)

invalidate(key)
```

ช่วยควบคุมการเข้าถึงข้อมูล Cache ให้เป็นระบบ

---

### 🔐 AuthService

ใช้แนวคิดเดียวกันในการซ่อน

* Password Hashing
* Token Validation
* Authentication Logic
* Security Configuration

---

# 4️⃣ 🔄 Polymorphism — หลายรูปแบบ

Polymorphism ช่วยให้ Method หรือ Interface เดียวกันสามารถมีพฤติกรรมที่แตกต่างกันตาม Context

### 🎛️ Method Overriding

Controller ลูกสามารถ Override Method ที่กำหนดไว้ใน Parent Class ได้

ตัวอย่าง:

```text
BaseController
      ↓
PayrollSyncController
      ↓
ReportsController
```

Controller เฉพาะทางสามารถเพิ่ม Logic สำหรับตรวจสอบสิทธิ์ เช่น

```text
ADMIN
HR_MANAGER
```

ก่อนอนุญาตให้ดำเนินการ

---

### 📤 Data Exporter Pattern

ไฟล์:

```text
lib/exporters.ts
```

รองรับการ Export ข้อมูลหลายรูปแบบ เช่น

* 📊 Excel
* 📄 CSV
* 📑 PDF

โดยใช้ Interface กลางเพื่อกำหนดโครงสร้างการทำงาน

---

# 🧩 OOP Design Patterns

โปรเจกต์มีการประยุกต์ใช้ Design Pattern หลายรูปแบบ

---

## 1️⃣ Repository Pattern

📁 `lib/repositories/`

ทำหน้าที่แยก

```text
Business Logic
       ↕
Data Access Logic
```

ออกจากกัน

ข้อดีคือ หากในอนาคตเปลี่ยน Database จาก

```text
Google Sheets
       ↓
PostgreSQL / MongoDB
```

จะสามารถเปลี่ยนแปลงที่ Repository Layer เป็นหลัก โดยลดผลกระทบต่อ Service และ Controller

---

## 2️⃣ 🧠 Service Layer Pattern

📁 `lib/services/`

รวบรวม Business Rules ไว้ในจุดเดียว

ตัวอย่าง:

### 💰 PayrollService

ดูแล

* เงินเดือน
* OT
* ขาดงาน
* ลา
* มาสาย
* ภาษี
* ประกันสังคม

### 📝 AuditService

ดูแล

* Audit Logs
* ประวัติการทำรายการ
* การติดตามการเปลี่ยนแปลงข้อมูล

---

## 3️⃣ ⚡ Singleton Pattern

ใช้กับ Component ที่ต้องการ Instance เดียวตลอด Application Lifecycle เช่น

```text
GoogleSheetsClient
CacheManager
```

ประโยชน์หลัก:

* 💾 ลดการใช้ Memory
* 📊 ควบคุม Google API Quota
* 🔌 ควบคุม Connection
* ⚡ ลดการสร้าง Object ซ้ำ

---

# 🔗 Architecture Summary

ภาพรวมการไหลของข้อมูลสามารถสรุปได้ดังนี้

```text
👤 User
   │
   ▼
🖥️ React / Next.js UI
   │
   ▼
🌐 API Route
   │
   ▼
🎛️ Controller
   │
   ▼
🧠 Service
   │
   ▼
🗂️ Repository
   │
   ▼
⚙️ Infrastructure
   │
   ├── ⚡ CacheManager
   │
   └── 📊 GoogleSheetsClient
           │
           ▼
      📊 Google Sheets
```

---

# 🎯 Project Goals

HR Pro Suite V2 ถูกออกแบบโดยมีเป้าหมายหลักคือ

> **สร้างระบบ HRMS ที่มีโครงสร้างชัดเจน ขยายระบบได้ง่าย และแยกแต่ละความรับผิดชอบออกจากกันอย่างเป็นระบบ**

### ⭐ จุดเด่นของ Architecture

* 🧩 **Modular** — แยก Module ชัดเจน
* 🧠 **Maintainable** — ดูแลและแก้ไขง่าย
* 🔄 **Scalable** — รองรับการขยายระบบ
* 🔐 **Secure** — มี Authentication / Authorization
* 📊 **Data Abstraction** — ไม่ผูก Business Logic กับ Database โดยตรง
* ⚡ **Performance** — มี Cache ลด API Calls
* 📝 **Auditable** — มีระบบ Audit Logs
* 🔌 **Extensible** — สามารถเปลี่ยน Data Store ในอนาคตได้

---

# 🚀 Final Architecture

```text
                    🏢 HR PRO SUITE V2
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
   🖥️ FRONTEND                          🔐 SECURITY
   Next.js / React                      JWT / RBAC
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
                    🌐 API ROUTES
                           │
                           ▼
                    🎛️ CONTROLLERS
                           │
                           ▼
                     🧠 SERVICES
                           │
                           ▼
                    🗂️ REPOSITORIES
                           │
                           ▼
                  ⚙️ INFRASTRUCTURE
                    │            │
                    ▼            ▼
             ⚡ CACHE       📊 GOOGLE SHEETS
                           │
                           ▼
                     📝 AUDIT LOG
```

> **HR Pro Suite V2 = HRMS + Clean Architecture + OOP + Google Sheets Data Store**

เอกสารนี้สามารถใช้เป็น **Project README / Technical Documentation / Architecture Reference** สำหรับทีมพัฒนาและการต่อยอดระบบในอนาคตได้
