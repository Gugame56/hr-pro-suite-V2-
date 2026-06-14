"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import {
  Search, Bell, Settings, LogOut, Home, Users, Clock, DollarSign, Briefcase,
  Badge, UserPlus, CalendarDays, CalendarX, Timer,
  Heart, ShieldPlus, HandCoins, Receipt, GraduationCap, Compass, LineChart,
  Trophy, Laptop, FileText, BriefcaseBusiness, AlertTriangle, PieChart, MessageSquare,
  User, X, CornerDownLeft, ShieldCheck, CheckCircle2, Info,
  Megaphone, Plane, Presentation
} from "lucide-react";
import Link from "next/link";
import { NAV_MODULES } from "@/lib/navModules";
import { canManage } from "@/lib/permissions";
import { notificationsFor, type AppNotification } from "@/lib/notifications";

const inter = Inter({ subsets: ["latin"] });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [user, setUser] = useState<any>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    // โหลดข้อมูล Session
    const session = localStorage.getItem("hr_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUser(parsed);
      // โหลดแจ้งเตือนเฉพาะที่เกี่ยวกับ role ของผู้ใช้ (พนักงานเห็นแค่ของตัวเอง)
      setNotifs(notificationsFor(parsed.role));
    } else if (!isLoginPage) {
      // ถ้าไม่มี Session และไม่ใช่หน้า Login ให้ส่งกลับไปหน้า Login
      router.push("/login");
    }
  }, [pathname, isLoginPage, router]);

  // Attach the signed-in user's role to every /api request so server-side route
  // guards (lib/apiGuard.ts) can enforce that only Admin/Manager may write managed
  // data. Patches window.fetch once; safe for reads (extra headers are ignored).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    if (w.__hrFetchPatched) return;
    const orig = window.fetch.bind(window);
    window.fetch = (input: any, init: any = {}) => {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        if (url.includes("/api/")) {
          const raw = localStorage.getItem("hr_session");
          if (raw) {
            const u = JSON.parse(raw);
            const headers = new Headers(
              init.headers || (typeof input !== "string" ? input.headers : undefined)
            );
            if (u.role) headers.set("x-role", String(u.role).toLowerCase());
            if (u.email) headers.set("x-actor", String(u.email));
            init = { ...init, headers };
          }
        }
      } catch {
        /* fall through to the unpatched fetch */
      }
      return orig(input, init);
    };
    w.__hrFetchPatched = true;
  }, []);

  // Global Ctrl/⌘+K shortcut to open the search palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close palette on route change.
  useEffect(() => setPaletteOpen(false), [pathname]);

  // Close the notification dropdown on route change.
  useEffect(() => setNotifOpen(false), [pathname]);

  // Close the notification dropdown when clicking outside of it.
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: number) =>
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handleLogout = () => {
    localStorage.removeItem("hr_session");
    router.push("/login");
  };

  if (isLoginPage) {
    return <div className={inter.className}>{children}</div>;
  }

  // ป้องกันการแสดง Dashboard ก่อนโหลด User สำเร็จ
  if (!user) return <div className="bg-bgDark h-screen"></div>;

  return (
    <div className={`${inter.className} bg-bgDark text-white h-screen flex overflow-hidden`}>
      {/* Sidebar */}
      <aside className="w-64 bg-cardDark border-r border-gray-800 flex flex-col h-full custom-scrollbar">
        <div className="p-6 sticky top-0 bg-cardDark z-10 border-b border-gray-800">
          <Link href={canManage(user.role) ? "/" : "/my-info"} className="group">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-brandPurple text-white p-1 rounded-md text-sm group-hover:bg-purple-600 transition-colors">HR</span> 
              HR Pro Suite
            </h1>
            <p className="text-xs text-textMuted mt-1">NEXT-GEN HR OS</p>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 text-sm custom-scrollbar">
          {canManage(user.role) ? (
            <>
              {/* OVERVIEW */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">Overview</p>
                <div className="space-y-1">
                  <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Home size={18} /> หน้าหลัก
                  </Link>
                  <Link href="/notifications" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/notifications" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Bell size={18} /> การแจ้งเตือน
                  </Link>
                </div>
              </div>

              {/* PEOPLE */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">People</p>
                <div className="space-y-1">
                  <Link href="/employees" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/employees" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Users size={18} /> พนักงาน
                  </Link>
                  <Link href="/departments" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/departments" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Briefcase size={18} /> แผนก
                  </Link>
                  <Link href="/positions" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/positions" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Badge size={18} /> ตำแหน่ง
                  </Link>
                  <Link href="/recruitment" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/recruitment" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <UserPlus size={18} /> สรรหา
                  </Link>
                </div>
              </div>

              {/* TIME & WORK */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">Time & Work</p>
                <div className="space-y-1">
                  <Link href="/attendance" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/attendance" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Clock size={18} /> การเข้างาน
                  </Link>
                  <Link href="/shifts" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/shifts" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <CalendarDays size={18} /> จัดกะ
                  </Link>
                  <Link href="/leave" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/leave" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <CalendarX size={18} /> การลา
                  </Link>
                  <Link href="/overtime" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/overtime" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Timer size={18} /> โอที
                  </Link>
                </div>
              </div>

              {/* MONEY */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">Money</p>
                <div className="space-y-1">
                  <Link href="/payroll" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/payroll" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <DollarSign size={18} /> เงินเดือน
                  </Link>
                  <Link href="/benefits" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/benefits" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Heart size={18} /> สวัสดิการ
                  </Link>
                  <Link href="/social-security" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/social-security" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <ShieldPlus size={18} /> ประกันสังคม
                  </Link>
                  <Link href="/loans" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/loans" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <HandCoins size={18} /> เงินกู้/เบิกล่วงหน้า
                  </Link>
                  <Link href="/expenses" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/expenses" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Receipt size={18} /> เบิกค่าใช้จ่าย
                  </Link>
                </div>
              </div>

              {/* GROWTH */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">Growth</p>
                <div className="space-y-1">
                  <Link href="/training" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/training" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <GraduationCap size={18} /> อบรม
                  </Link>
                  <Link href="/onboarding" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/onboarding" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Compass size={18} /> ปฐมนิเทศ
                  </Link>
                  <Link href="/evaluations" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/evaluations" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <LineChart size={18} /> ประเมินผล
                  </Link>
                  <Link href="/rewards" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/rewards" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Trophy size={18} /> รางวัล
                  </Link>
                  <Link href="/announcements" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/announcements" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Megaphone size={18} /> ประกาศ
                  </Link>
                  <Link href="/company-trips" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/company-trips" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Plane size={18} /> ทริปบริษัท
                  </Link>
                  <Link href="/meetings" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/meetings" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Presentation size={18} /> จัดประชุม
                  </Link>
                </div>
              </div>

              {/* OPERATIONS */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">Operations</p>
                <div className="space-y-1">
                  <Link href="/assets" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/assets" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Laptop size={18} /> ทรัพย์สิน
                  </Link>
                  <Link href="/documents" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/documents" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <FileText size={18} /> เอกสาร
                  </Link>
                  <Link href="/business-trips" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/business-trips" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <BriefcaseBusiness size={18} /> เดินทางธุรกิจ
                  </Link>
                  <Link href="/discipline" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/discipline" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <AlertTriangle size={18} /> วินัย
                  </Link>
                  <Link href="/resignations" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/resignations" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <LogOut size={18} /> ลาออก
                  </Link>
                </div>
              </div>

              {/* SYSTEM */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">System</p>
                <div className="space-y-1">
                  <Link href="/reports" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/reports" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <PieChart size={18} /> รายงาน
                  </Link>
                  <Link href="/line-oa" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/line-oa" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <MessageSquare size={18} /> LINE OA
                  </Link>
                  <Link href="/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/settings" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Settings size={18} /> ตั้งค่าระบบ
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* MY WORKSPACE (Simplified for Employee) */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">MY WORKSPACE</p>
                <div className="space-y-1">
                  <Link href="/my-info" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/my-info" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <User size={18} /> My Info
                  </Link>
                  <Link href="/notifications" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/notifications" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Bell size={18} /> การแจ้งเตือน
                  </Link>
                  <Link href="/attendance" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/attendance" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Clock size={18} /> เช็คชื่อ / การเข้างาน
                  </Link>
                  <Link href="/leave" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/leave" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <CalendarX size={18} /> การลาของฉัน
                  </Link>
                  <Link href="/payroll" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/payroll" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <DollarSign size={18} /> สลิปเงินเดือน
                  </Link>
                  <Link href="/social-security" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/social-security" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <ShieldPlus size={18} /> ประกันสังคม
                  </Link>
                  <Link href="/benefits" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/benefits" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Heart size={18} /> สวัสดิการ
                  </Link>
                  <Link href="/documents/employment-cert" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/documents/employment-cert" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <FileText size={18} /> ขอใบรับรองการทำงาน
                  </Link>
                  <Link href="/documents/salary-cert" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/documents/salary-cert" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <FileText size={18} /> ขอใบรับรองเงินเดือน
                  </Link>
                  <Link href="/resignations" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/resignations" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <LogOut size={18} /> ลาออก
                  </Link>
                </div>
              </div>

              {/* DISCOVER (Simplified for Employee) */}
              <div>
                <p className="text-xs text-textMuted font-semibold mb-3 uppercase tracking-wider pl-3">DISCOVER</p>
                <div className="space-y-1">
                  <Link href="/training" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/training" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <GraduationCap size={18} /> อบรม
                  </Link>
                  <Link href="/announcements" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/announcements" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Megaphone size={18} /> ประกาศ
                  </Link>
                  <Link href="/company-trips" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/company-trips" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Plane size={18} /> ทริปบริษัท
                  </Link>
                  <Link href="/meetings" className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${pathname === "/meetings" ? "text-brandPurple bg-brandPurple/10" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
                    <Presentation size={18} /> จัดประชุม
                  </Link>
                </div>
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full">
        {/* Topbar */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-bgDark shrink-0">
          {/* Global Search trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="group relative w-96 flex items-center gap-3 bg-cardDark border border-gray-800 rounded-full py-2 px-4 text-sm text-gray-500 hover:border-brandPurple/60 hover:text-gray-300 transition-colors"
          >
            <Search size={18} className="text-gray-500 group-hover:text-brandPurple transition-colors" />
            <span className="flex-1 text-left">ค้นหาทุกอย่างในระบบ...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-semibold bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400">
              Ctrl K
            </kbd>
          </button>
          <div className="flex items-center gap-4">
            {/* Notification bell with badge + dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-all"
                title="การแจ้งเตือน"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brandRed px-1 text-[9px] font-bold text-white ring-2 ring-bgDark">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-cardDark border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-[70] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="text-sm font-bold text-white">การแจ้งเตือน</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-brandPurple hover:underline font-semibold">
                        อ่านแล้วทั้งหมด
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifs.length === 0 ? (
                      <p className="text-center text-textMuted text-sm py-8">ไม่มีการแจ้งเตือน</p>
                    ) : (
                      notifs.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full flex gap-3 px-4 py-3 border-b border-gray-800 last:border-0 text-left hover:bg-gray-800/30 transition-colors ${n.read ? "opacity-60" : ""}`}
                        >
                          <span className="shrink-0 mt-0.5">{notifIcon(n.type)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brandPurple shrink-0" />}
                              <span className="text-xs font-bold text-white truncate">{n.title}</span>
                            </span>
                            <span className="block text-[11px] text-textMuted leading-relaxed line-clamp-2 mt-0.5">{n.desc}</span>
                            <span className="block text-[10px] text-gray-600 mt-1">{n.time}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs text-brandPurple hover:bg-gray-800/40 font-semibold py-3 border-t border-gray-800"
                  >
                    ดูทั้งหมด
                  </Link>
                </div>
              )}
            </div>
            {canManage(user.role) && (
              <Link href="/settings" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-all">
                <Settings size={20} />
              </Link>
            )}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
              <div className="w-9 h-9 rounded-full bg-brandPurple flex items-center justify-center text-sm font-bold shadow-lg shadow-brandPurple/20">
                {user.avatar}
              </div>
              <div className="text-sm hidden md:block">
                <p className="font-semibold text-white leading-tight">{user.name}</p>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    canManage(user.role) ? "bg-brandPurple/20 text-brandPurple" : "bg-brandBlue/20 text-brandBlue"
                  }`}>
                    {user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "พนักงาน"}
                  </span>
                  <span className="text-xs text-textMuted">• {user.position}</span>
                </div>
              </div>
              <button onClick={handleLogout} title="ออกจากระบบ">
                <LogOut size={18} className="text-gray-400 ml-2 cursor-pointer hover:text-brandRed transition-colors" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>
      </main>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={(href) => router.push(href)} />
      )}
    </div>
  );
}

/** Pick the accent icon for a notification type. */
function notifIcon(type: AppNotification["type"]) {
  switch (type) {
    case "success": return <CheckCircle2 className="text-brandGreen" size={18} />;
    case "warning": return <AlertTriangle className="text-brandOrange" size={18} />;
    default: return <Info className="text-brandPurple" size={18} />;
  }
}

/** Ctrl+K global search — fuzzy-filters all modules and navigates on Enter/click. */
function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_MODULES;
    return NAV_MODULES.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.group.toLowerCase().includes(q) ||
        (m.keywords ?? "").toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    onNavigate(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].href);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-cardDark border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-gray-800">
          <Search size={18} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ค้นหาเมนู โมดูล หรือหน้า..."
            className="flex-1 bg-transparent py-4 text-sm text-white focus:outline-none placeholder:text-gray-600"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
          {results.length === 0 ? (
            <p className="text-center text-textMuted text-sm py-8">ไม่พบเมนูที่ตรงกับ “{query}”</p>
          ) : (
            results.map((m, i) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.href}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(m.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    i === active ? "bg-brandPurple/15 text-white" : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  <span className={`p-1.5 rounded-md ${i === active ? "bg-brandPurple/30 text-brandPurple" : "bg-gray-800 text-gray-500"}`}>
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-sm font-medium">{m.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-600">{m.group}</span>
                  {i === active && <CornerDownLeft size={14} className="text-brandPurple" />}
                </button>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><kbd className="bg-gray-800 px-1 rounded">↑</kbd><kbd className="bg-gray-800 px-1 rounded">↓</kbd> เลื่อน</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-800 px-1 rounded">↵</kbd> เปิด</span>
          <span className="flex items-center gap-1"><kbd className="bg-gray-800 px-1 rounded">esc</kbd> ปิด</span>
          <span className="ml-auto flex items-center gap-1"><ShieldCheck size={11} /> {NAV_MODULES.length} โมดูล</span>
        </div>
      </div>
    </div>
  );
}
