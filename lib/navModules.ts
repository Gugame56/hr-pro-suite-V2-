// Single source of truth for the app modules.
// Used by the topbar global search (Ctrl+K) and the dashboard Quick Access grid.

import {
  Home, Bell, Users, Briefcase, Badge, UserPlus, Clock, CalendarDays,
  CalendarX, Timer, DollarSign, Heart, ShieldPlus, HandCoins, Receipt,
  GraduationCap, Compass, LineChart, Trophy, Laptop, FileText,
  BriefcaseBusiness, AlertTriangle, LogOut, PieChart, MessageSquare, Settings,
  Megaphone, Plane, Presentation,
  type LucideIcon,
} from "lucide-react";

export type NavModule = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
};

export const NAV_MODULES: NavModule[] = [
  { label: "หน้าหลัก", href: "/", icon: Home, group: "Overview", keywords: "dashboard home" },
  { label: "การแจ้งเตือน", href: "/notifications", icon: Bell, group: "Overview", keywords: "notification" },
  { label: "พนักงาน", href: "/employees", icon: Users, group: "People", keywords: "employee staff คน" },
  { label: "แผนก", href: "/departments", icon: Briefcase, group: "People", keywords: "department" },
  { label: "ตำแหน่ง", href: "/positions", icon: Badge, group: "People", keywords: "position role" },
  { label: "สรรหา", href: "/recruitment", icon: UserPlus, group: "People", keywords: "recruitment hiring" },
  { label: "การเข้างาน", href: "/attendance", icon: Clock, group: "Time & Work", keywords: "attendance checkin" },
  { label: "จัดกะ", href: "/shifts", icon: CalendarDays, group: "Time & Work", keywords: "shift" },
  { label: "การลา", href: "/leave", icon: CalendarX, group: "Time & Work", keywords: "leave vacation" },
  { label: "โอที", href: "/overtime", icon: Timer, group: "Time & Work", keywords: "overtime ot" },
  { label: "เงินเดือน", href: "/payroll", icon: DollarSign, group: "Money", keywords: "payroll salary" },
  { label: "สวัสดิการ", href: "/benefits", icon: Heart, group: "Money", keywords: "benefits welfare" },
  { label: "ประกันสังคม", href: "/social-security", icon: ShieldPlus, group: "Money", keywords: "social security" },
  { label: "เงินกู้/เบิกล่วงหน้า", href: "/loans", icon: HandCoins, group: "Money", keywords: "loan advance" },
  { label: "เบิกค่าใช้จ่าย", href: "/expenses", icon: Receipt, group: "Money", keywords: "expense reimburse" },
  { label: "อบรม", href: "/training", icon: GraduationCap, group: "Growth", keywords: "training course" },
  { label: "ปฐมนิเทศ", href: "/onboarding", icon: Compass, group: "Growth", keywords: "onboarding" },
  { label: "ประเมินผล", href: "/evaluations", icon: LineChart, group: "Growth", keywords: "evaluation kpi" },
  { label: "รางวัล", href: "/rewards", icon: Trophy, group: "Growth", keywords: "reward award" },
  { label: "ประกาศ", href: "/announcements", icon: Megaphone, group: "Growth", keywords: "announcement news ข่าว ประกาศ" },
  { label: "ทริปบริษัท", href: "/company-trips", icon: Plane, group: "Growth", keywords: "company trip outing ทริป เที่ยว" },
  { label: "จัดประชุม", href: "/meetings", icon: Presentation, group: "Growth", keywords: "meeting agenda ประชุม" },
  { label: "ทรัพย์สิน", href: "/assets", icon: Laptop, group: "Operations", keywords: "asset equipment" },
  { label: "เอกสาร", href: "/documents", icon: FileText, group: "Operations", keywords: "document file" },
  { label: "เดินทางธุรกิจ", href: "/business-trips", icon: BriefcaseBusiness, group: "Operations", keywords: "business trip travel" },
  { label: "วินัย", href: "/discipline", icon: AlertTriangle, group: "Operations", keywords: "discipline" },
  { label: "ลาออก", href: "/resignations", icon: LogOut, group: "Operations", keywords: "resignation" },
  { label: "รายงาน", href: "/reports", icon: PieChart, group: "System", keywords: "report analytics" },
  { label: "LINE OA", href: "/line-oa", icon: MessageSquare, group: "System", keywords: "line oa flex" },
  { label: "ตั้งค่าระบบ", href: "/settings", icon: Settings, group: "System", keywords: "settings config" },
];
