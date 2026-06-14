# คู่มือการตั้งค่า Google Sheets สำหรับ HR Pro Suite

เพื่อให้ระบบเชื่อมต่อกับ Google Sheets ของคุณได้สำเร็จ กรุณาดำเนินการตามขั้นตอนดังนี้:

### 1. ข้อมูล Spreadsheet ของคุณ
*   **URL:** https://docs.google.com/spreadsheets/d/12G3p0UlreJOmQAEbo5ym5TAMnYhZ3krl3inTDX0MaPk/edit
*   **ID:** `12G3p0UlreJOmQAEbo5ym5TAMnYhZ3krl3inTDX0MaPk`

### 2. การเตรียมไฟล์ Google Sheets
*   เปิดลิงก์ด้านบน
*   ตั้งชื่อ Sheet (Tab ด้านล่าง) ว่า **"Employees"**
*   ในแถวที่ 1 (Header) ให้พิมพ์หัวข้อดังนี้ (เรียงตามลำดับ):
    `Name` | `Position` | `Department` | `Status` | `Email`

### 3. การตั้งค่าสิทธิ์ (สำคัญมาก)
*   อีเมล Service Account ของคุณคือ: `line-bot@mystic-aileron-476908-c4.iam.gserviceaccount.com`
*   ให้กดปุ่ม **"แชร์" (Share)** ใน Google Sheets และเพิ่มอีเมลด้านบนนี้เป็น **"Editor"**

### 4. การตั้งค่า Environment Variables
สร้างไฟล์ `.env.local` ในโฟลเดอร์หลักของโปรเจค และใส่ข้อมูลดังนี้:

```env
GOOGLE_CLIENT_EMAIL=line-bot@mystic-aileron-476908-c4.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="ใส่_Private_Key_ที่ได้จากไฟล์_JSON_ที่นี่"
SPREADSHEET_ID=12G3p0UlreJOmQAEbo5ym5TAMnYhZ3krl3inTDX0MaPk
```

*หมายเหตุ: สำหรับ GOOGLE_PRIVATE_KEY ให้คัดลอกมาทั้งหมดรวมถึงส่วนที่ขึ้นต้นด้วย -----BEGIN PRIVATE KEY-----*

### 5. การสร้างตารางข้อมูลอัตโนมัติ
หลังจากตั้งค่า `.env.local` เรียบร้อยแล้ว ให้รันคำสั่งนี้เพื่อสร้าง Sheet ทั้งหมดที่จำเป็น (26 Sheets):

```bash
node scripts/setup-sheets.js
```

### 6. เริ่มต้นใช้งานโปรเจค
รันคำสั่งเพื่อเริ่มระบบในโหมดพัฒนา:

```bash
npm install
npm run dev
```
