// Shared notification data — used by both the topbar bell dropdown
// and the full /notifications page so the badge count stays in sync.

export type NotificationType = "success" | "info" | "warning";

// Who a notification is meant for:
//  - "employee": personal to the logged-in employee (their leave, payslip, etc.)
//  - "admin": back-office items only admins should act on (approvals, new applicants)
//  - "all": company-wide broadcast everyone sees
export type NotificationAudience = "employee" | "admin" | "all";

export type AppNotification = {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: NotificationType;
  audience: NotificationAudience;
  read?: boolean;
};

export const NOTIFICATIONS: AppNotification[] = [
  { id: 1, title: "คำขอลาได้รับการอนุมัติ", desc: "การลาพักร้อนวันที่ 12-15 มิ.ย. ของคุณได้รับการอนุมัติแล้ว", time: "2 ชั่วโมงที่แล้ว", type: "success", audience: "employee", read: false },
  { id: 2, title: "ประกาศใหม่จากบริษัท", desc: "มีการอัปเดตนโยบายการทำงานแบบ Hybrid", time: "5 ชั่วโมงที่แล้ว", type: "info", audience: "all", read: false },
  { id: 3, title: "แจ้งเตือนการเข้างานสาย", desc: "คุณเข้างานสายเกิน 15 นาที เมื่อเช้านี้", time: "8 ชั่วโมงที่แล้ว", type: "warning", audience: "employee", read: false },
  { id: 4, title: "สลิปเงินเดือนออกแล้ว", desc: "สลิปเงินเดือนประจำเดือนพฤษภาคมของคุณพร้อมให้ดาวน์โหลด", time: "1 วันที่แล้ว", type: "info", audience: "employee", read: true },
  { id: 5, title: "อบรม React Advanced พรุ่งนี้", desc: "คุณลงทะเบียนคอร์สอบรมไว้ เริ่ม 09:00 น.", time: "1 วันที่แล้ว", type: "info", audience: "employee", read: false },
  { id: 6, title: "มีคำขอลารออนุมัติ", desc: "สมชาย ใจดี ยื่นขอลาป่วย 2 วัน รอการอนุมัติจากคุณ", time: "30 นาทีที่แล้ว", type: "warning", audience: "admin", read: false },
  { id: 7, title: "ผู้สมัครใหม่", desc: "มีผู้สมัครตำแหน่ง Frontend Developer 1 คน", time: "3 ชั่วโมงที่แล้ว", type: "info", audience: "admin", read: false },
];

// Return only the notifications a given role should see.
// Employees get personal + company-wide items (never admin-only back-office items).
export function notificationsFor(role: string | undefined): AppNotification[] {
  if (role === "admin") return NOTIFICATIONS;
  return NOTIFICATIONS.filter((n) => n.audience === "employee" || n.audience === "all");
}
