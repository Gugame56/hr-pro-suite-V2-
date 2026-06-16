"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, CheckCircle, Calendar, DollarSign, Plus, X, Loader2,
  Radio, CalendarClock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie, Legend,
} from "recharts";
import { NAV_MODULES } from "@/lib/navModules";
import { canManage } from "@/lib/permissions";

const DEPT_COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];
const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// Static class strings so Tailwind's scanner generates them (dynamic
// `bg-${color}` interpolation would never be emitted).
type Accent = { text: string; solid: string; bg15: string; bg20: string; hoverBorder: string };
const ACCENT: Record<string, Accent> = {
  brandPurple: { text: "text-brandPurple", solid: "bg-brandPurple", bg15: "bg-brandPurple/15", bg20: "bg-brandPurple/20", hoverBorder: "hover:border-brandPurple/50" },
  brandGreen: { text: "text-brandGreen", solid: "bg-brandGreen", bg15: "bg-brandGreen/15", bg20: "bg-brandGreen/20", hoverBorder: "hover:border-brandGreen/50" },
  brandOrange: { text: "text-brandOrange", solid: "bg-brandOrange", bg15: "bg-brandOrange/15", bg20: "bg-brandOrange/20", hoverBorder: "hover:border-brandOrange/50" },
  brandBlue: { text: "text-brandBlue", solid: "bg-brandBlue", bg15: "bg-brandBlue/15", bg20: "bg-brandBlue/20", hoverBorder: "hover:border-brandBlue/50" },
  brandRed: { text: "text-brandRed", solid: "bg-brandRed", bg15: "bg-brandRed/15", bg20: "bg-brandRed/20", hoverBorder: "hover:border-brandRed/50" },
};

export default function Dashboard() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    department: "Technology",
    email: "",
    status: "Active",
  });

  useEffect(() => {
    const session = localStorage.getItem("hr_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUser(parsed);
      // หน้า Dashboard รวมเป็นของ Admin/Manager เท่านั้น — พนักงานเด้งไปหน้าตัวเอง
      if (!canManage(parsed.role)) {
        router.replace("/my-info");
        return;
      }
    }

    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setEmployees(data))
      .catch((err) => console.error("Error fetching employees:", err));

    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => setReport(data))
      .catch((err) => console.error("Error fetching reports:", err));
  }, [router]);

  // --- Chart data ---
  const weeklyData = useMemo(() => {
    // Reorder so the last 7 days end with today (Sun..Sat from API).
    const today = new Date().getDay();
    const raw: number[] = report?.weeklyAttendance ?? [0, 0, 0, 0, 0, 0, 0];
    const out: { day: string; count: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const idx = (today - i + 7) % 7;
      out.push({ day: DAY_LABELS[idx], count: raw[idx] ?? 0, isToday: i === 0 });
    }
    return out;
  }, [report]);

  const deptData = useMemo(() => {
    const dist = report?.departmentDistribution;
    if (Array.isArray(dist) && dist.length) {
      return dist.map((d: any) => ({ name: d.name, value: d.count }));
    }
    // Fallback: derive from the employee list.
    const counts: Record<string, number> = {};
    employees.forEach((e) => {
      const d = e.department || "Unassigned";
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [report, employees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert("เพิ่มพนักงานสำเร็จ!");
        setIsModalOpen(false);
        setFormData({ name: "", position: "", department: "Technology", email: "", status: "Active" });
        const res = await fetch("/api/employees");
        const data = await res.json();
        if (Array.isArray(data)) setEmployees(data);
      } else {
        const err = await response.json();
        alert("เกิดข้อผิดพลาด: " + err.error);
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อกับ Server ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // กิจกรรมที่กำลังจะมาถึง — ประชุมจริงจาก Meetings (ส่งมาทาง /api/reports)
  const upcoming = useMemo(() => {
    const list: any[] = Array.isArray(report?.upcoming) ? report.upcoming : [];
    return list.map((ev: any) => {
      const d = new Date(ev.date);
      const dateLabel = Number.isNaN(d.getTime())
        ? ev.date
        : d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      const timeLabel = ev.startTime
        ? `${ev.startTime}${ev.endTime ? ` - ${ev.endTime}` : ""}`
        : "ทั้งวัน";
      const where = ev.location ? ` • ${ev.location}` : "";
      return {
        icon: Calendar,
        color: "brandBlue",
        title: ev.title,
        when: `${dateLabel} • ${timeLabel}${where}`,
        tag: "ประชุม",
      };
    });
  }, [report]);

  // พนักงานไม่มีสิทธิ์เห็น Dashboard รวม — แสดงว่างไว้ระหว่างเด้งไป /my-info
  if (user && !canManage(user.role)) {
    return <div className="h-full" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-textMuted text-sm">Welcome back, {user?.name || "Guest"} 👋</p>
        </div>
        {canManage(user?.role) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brandPurple hover:bg-purple-600 active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-brandPurple/25"
          >
            <Plus size={18} />
            เพิ่มพนักงาน
          </button>
        )}
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard color="brandPurple" icon={<Users size={18} />} label="พนักงานทั้งหมด"
          value={employees.length || 0} note="▲ ข้อมูลจาก Google Sheets" noteClass="text-brandGreen" />
        <SummaryCard color="brandGreen" icon={<CheckCircle size={18} />} label="วันนี้มาทำงาน"
          value={`${weeklyData[6]?.count ?? 0} / ${employees.length || 10}`} note="อัปเดตแบบเรียลไทม์" />
        <SummaryCard color="brandOrange" icon={<Calendar size={18} />} label="คำขอลารออนุมัติ"
          value={report?.summary?.pendingLeave ?? 0} note="จากระบบลางาน" noteClass="text-brandOrange" />
        <SummaryCard color="brandBlue" icon={<DollarSign size={18} />} label="เงินเดือนเดือนนี้"
          value={report ? `฿${Math.round((report.summary?.monthlyPayroll || 0) / 1000)}K` : "—"}
          note="ข้อมูลรวมจ่าย" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance bar chart */}
        <div className="lg:col-span-2 bg-cardDark border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">การเข้างาน 7 วันล่าสุด</h3>
            <span className="flex items-center gap-1.5 bg-brandRed/10 text-brandRed text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
              <Radio size={11} className="animate-pulse" /> Live
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(139,92,246,0.08)" }}
                  contentStyle={{ background: "#151923", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {weeklyData.map((d, i) => (
                    <Cell key={i} fill={d.isToday ? "#8B5CF6" : "#3F3A5C"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department donut */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">พนักงานตามแผนก</h3>
          <div className="h-64">
            {deptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-textMuted text-sm italic">ยังไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                    {deptData.map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#151923", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming timeline */}
      <div>
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <CalendarClock className="text-brandPurple" size={20} /> กิจกรรมที่กำลังจะมาถึง
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-textMuted italic py-4">ยังไม่มีประชุมที่กำหนดไว้ล่วงหน้า</p>
          ) : (
          <div className="relative pl-4">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-800" />
            <div className="space-y-5">
              {upcoming.map((ev, i) => {
                const a = ACCENT[ev.color];
                return (
                  <div key={i} className="relative flex items-start gap-4">
                    <span className={`relative z-10 mt-1 w-3.5 h-3.5 rounded-full ${a.solid} ring-4 ring-cardDark shrink-0`} />
                    <div className={`p-2 rounded-lg ${a.bg15} ${a.text}`}>
                      <ev.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{ev.title}</p>
                      <p className="text-xs text-textMuted">{ev.when}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${a.bg15} ${a.text}`}>
                      {ev.tag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Quick Access grid */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">เข้าถึงด่วน (Quick Access)</h3>
          <span className="text-xs text-textMuted">{NAV_MODULES.length} โมดูล</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {NAV_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-800 hover:border-brandPurple/50 hover:bg-brandPurple/5 transition-all group text-center">
                <span className="p-2.5 rounded-xl bg-gray-800/60 text-gray-400 group-hover:bg-brandPurple/20 group-hover:text-brandPurple transition-all">
                  <Icon size={20} />
                </span>
                <span className="text-[10px] text-textMuted group-hover:text-white transition-colors leading-tight line-clamp-2">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">เพิ่มพนักงานใหม่</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textMuted uppercase mb-1">ชื่อ-นามสกุล</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-textMuted uppercase mb-1">ตำแหน่ง</label>
                  <input
                    required
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                    placeholder="เช่น Developer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textMuted uppercase mb-1">แผนก</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors appearance-none text-white"
                  >
                    <option>Technology</option>
                    <option>Marketing</option>
                    <option>HR</option>
                    <option>Sales</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-textMuted uppercase mb-1">อีเมล</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                  placeholder="email@company.com"
                />
              </div>
              <div className="pt-4">
                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full bg-brandPurple hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : "บันทึกข้อมูลลง Google Sheets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  color, icon, label, value, note, noteClass = "text-textMuted",
}: {
  color: string; icon: React.ReactNode; label: string; value: React.ReactNode; note: string; noteClass?: string;
}) {
  const a = ACCENT[color] ?? ACCENT.brandPurple;
  return (
    <div className={`bg-cardDark border border-gray-800 p-5 rounded-2xl relative overflow-hidden group ${a.hoverBorder} transition-all cursor-default`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${a.bg15} blur-2xl rounded-full transition-all`}></div>
      <div className="flex justify-between items-start mb-4 relative">
        <p className="text-textMuted text-sm font-medium">{label}</p>
        <div className={`p-2 ${a.bg20} ${a.text} rounded-lg group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <h3 className="text-3xl font-bold text-white relative">{value}</h3>
      <p className={`text-xs ${noteClass} mt-2 relative`}>{note}</p>
    </div>
  );
}
