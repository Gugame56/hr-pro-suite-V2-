"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Calendar, Users, Clock, Sun, Sunset, Moon, CalendarDays,
  LayoutGrid, List, CalendarClock,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { useCanManage } from "@/lib/useCanManage";

type Shift = {
  id?: string;
  employee_id?: string;
  employee_name?: string;
  date?: string;
  shift_type?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
};

type Employee = { id?: string; name?: string };

// Visual metadata per shift type — keeps colours consistent across the
// dashboard, badges and donut. Tailwind classes + a raw hex for the donut.
const SHIFT_META: Record<string, { label: string; icon: any; badge: string; dot: string; hex: string }> = {
  Morning: { label: "เช้า", icon: Sun, badge: "bg-amber-500/10 text-amber-500", dot: "bg-amber-500", hex: "#f59e0b" },
  Afternoon: { label: "บ่าย", icon: Sunset, badge: "bg-brandPurple/10 text-brandPurple", dot: "bg-brandPurple", hex: "#8b5cf6" },
  Night: { label: "ดึก", icon: Moon, badge: "bg-blue-500/10 text-blue-500", dot: "bg-blue-500", hex: "#3b82f6" },
};

const SHIFT_ORDER = ["Morning", "Afternoon", "Night"];

// Live/seed rows store the shift type in Thai (กะเช้า) while the UI keys off
// English (Morning). Normalise both so badges, the donut and the filter agree.
const SHIFT_ALIAS: Record<string, string> = {
  "กะเช้า": "Morning", "เช้า": "Morning", morning: "Morning",
  "กะบ่าย": "Afternoon", "บ่าย": "Afternoon", afternoon: "Afternoon",
  "กะดึก": "Night", "ดึก": "Night", "กลางคืน": "Night", night: "Night",
};
const normShift = (v?: string) => {
  if (!v) return "";
  const t = String(v).trim();
  return SHIFT_ALIAS[t] ?? SHIFT_ALIAS[t.toLowerCase()] ?? t;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const formatDateLabel = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
};

export default function ShiftsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  // Raw rows come back camelCase (employeeId/shiftType/…) and carry no name; we
  // enrich them into the snake_case shape the rest of this page renders.
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"board" | "table">("board");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "", date: "", shiftType: "Morning", startTime: "08:00", endTime: "17:00", notes: "",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shifts");
      const data = await res.json();
      if (Array.isArray(data)) setShifts(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลกะ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // employeeId -> name, so we can show the employee name (the Shifts sheet only stores the id).
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employees) if (e.id) m[e.id] = e.name || "";
    return m;
  }, [employees]);

  // Normalise raw API rows into the snake_case shape the UI renders: join the
  // employee name by id and canonicalise the shift type (Thai -> English key).
  const enriched: Shift[] = useMemo(
    () =>
      shifts.map((s: any) => {
        const empId = s.employeeId ?? s.employee_id ?? "";
        return {
          id: s.id,
          employee_id: empId,
          employee_name: nameById[empId] || s.employeeName || s.employee_name || "",
          date: s.date,
          shift_type: normShift(s.shiftType ?? s.shift_type),
          start_time: s.startTime ?? s.start_time,
          end_time: s.endTime ?? s.end_time,
          notes: s.notes,
        };
      }),
    [shifts, nameById]
  );

  const filteredShifts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return enriched.filter((shift) => {
      const matchesSearch =
        shift.employee_name?.toLowerCase().includes(q) ||
        shift.date?.toLowerCase().includes(q) ||
        shift.shift_type?.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || shift.shift_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [enriched, searchTerm, typeFilter]);

  // --- Dashboard metrics ---
  const metrics = useMemo(() => {
    const today = todayStr();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const byType: Record<string, number> = { Morning: 0, Afternoon: 0, Night: 0 };
    for (const s of enriched) if (s.shift_type && byType[s.shift_type] != null) byType[s.shift_type]++;

    return {
      total: enriched.length,
      employees: new Set(enriched.map((s) => s.employee_id).filter(Boolean)).size,
      today: enriched.filter((s) => s.date === today).length,
      week: enriched.filter((s) => s.date && s.date >= today && s.date <= weekEndStr).length,
      byType,
    };
  }, [enriched]);

  const todayShifts = useMemo(() => {
    const today = todayStr();
    return enriched
      .filter((s) => s.date === today)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [enriched]);

  // Group filtered shifts by date (newest first) for the board view.
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Shift[]> = {};
    for (const s of filteredShifts) {
      const key = s.date || "ไม่ระบุวันที่";
      (groups[key] ||= []).push(s);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => [date, list.sort((x, y) => (x.start_time || "").localeCompare(y.start_time || ""))] as const);
  }, [filteredShifts]);

  const openAddModal = () => {
    setEditingShift(null);
    setFormData({ employeeId: "", date: todayStr(), shiftType: "Morning", startTime: "08:00", endTime: "17:00", notes: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      employeeId: shift.employee_id || "",
      date: shift.date || "",
      shiftType: shift.shift_type || "Morning",
      startTime: shift.start_time || "08:00",
      endTime: shift.end_time || "17:00",
      notes: shift.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingShift ? "PATCH" : "POST";
    const body = editingShift ? { id: editingShift.id, ...formData } : formData;
    try {
      const res = await fetch("/api/shifts", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingShift ? "อัปเดตกะการทำงานสำเร็จ" : "จัดกะสำเร็จ");
      await fetchShifts();
      setIsModalOpen(false);
    } catch {
      showNotification("บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบกะการทำงานนี้?")) return;
    try {
      const res = await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบกะการทำงานสำเร็จ");
      await fetchShifts();
    } catch {
      showNotification("ลบข้อมูลไม่สำเร็จ", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
          notification.type === "error" ? "bg-red-500" : "bg-brandGreen"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดกะการทำงาน (Work Shifts)</h2>
          <p className="text-textMuted text-sm">วางแผนและจัดการตารางเวลาทำงานของพนักงาน</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
          >
            <Plus size={18} /> จัดกะใหม่
          </button>
        )}
      </div>

      {/* ===== Dashboard ===== */}
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Calendar size={22} />} tint="bg-blue-500/10 text-blue-500" label="กะทั้งหมด" value={metrics.total} />
        <KpiCard icon={<Users size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="พนักงานที่มีกะ" value={metrics.employees} suffix="คน" />
        <KpiCard icon={<CalendarClock size={22} />} tint="bg-amber-500/10 text-amber-500" label="กะวันนี้" value={metrics.today} />
        <KpiCard icon={<CalendarDays size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="กะ 7 วันข้างหน้า" value={metrics.week} />
      </div>

      {/* Distribution + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut distribution */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-1">สัดส่วนกะการทำงาน</h3>
          <p className="text-textMuted text-xs mb-5">แบ่งตามประเภทกะทั้งหมด</p>
          <div className="flex items-center gap-6">
            <ShiftDonut byType={metrics.byType} total={metrics.total} />
            <div className="space-y-3 flex-1">
              {SHIFT_ORDER.map((type) => {
                const meta = SHIFT_META[type];
                const count = metrics.byType[type] || 0;
                const pct = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2 text-textMuted">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="text-white font-semibold">{count} <span className="text-textMuted font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${meta.dot} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Today's schedule */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">ตารางกะวันนี้</h3>
            <span className="text-xs text-textMuted">{new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <p className="text-textMuted text-xs mb-4">{todayShifts.length} กะที่ถูกจัดไว้สำหรับวันนี้</p>
          {todayShifts.length === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <CalendarClock className="text-gray-700 mb-2" size={32} />
              <p className="text-textMuted text-sm">ยังไม่มีการจัดกะสำหรับวันนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {todayShifts.map((s) => {
                const meta = SHIFT_META[s.shift_type ?? ""] ?? null;
                const Icon = meta?.icon ?? Clock;
                return (
                  <div key={s.id} className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-3">
                    <div style={gradientStyle(s.employee_id)} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {initials(s.employee_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{s.employee_name}</p>
                      <p className="text-textMuted text-xs flex items-center gap-1"><Clock size={11} /> {s.start_time} - {s.end_time}</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${meta?.badge ?? "bg-gray-700/50 text-gray-400"}`}>
                      <Icon size={11} /> {meta?.label ?? s.shift_type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน, วันที่, กะ..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple"
        >
          <option value="all">ทุกประเภทกะ</option>
          <option value="Morning">เช้า (Morning)</option>
          <option value="Afternoon">บ่าย (Afternoon)</option>
          <option value="Night">ดึก (Night)</option>
        </select>

        {/* View toggle */}
        <div className="flex bg-cardDark border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setView("board")}
            className={`p-1.5 rounded-lg transition-colors ${view === "board" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}
            title="มุมมองตามวัน"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}
            title="มุมมองตาราง"
          >
            <List size={18} />
          </button>
        </div>

        <span className="lg:ml-auto text-xs text-textMuted">{filteredShifts.length} / {shifts.length} รายการ</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลกะการทำงาน</p>
        </div>
      ) : view === "board" ? (
        <div className="space-y-5">
          {groupedByDate.map(([date, list]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-brandPurple" />
                <h3 className="text-sm font-semibold text-white">{formatDateLabel(date)}</h3>
                <span className="text-xs text-textMuted">· {list.length} กะ</span>
                <div className="flex-1 h-px bg-gray-800 ml-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} canManage={canManage} onEdit={() => openEditModal(shift)} onDelete={() => handleDelete(shift.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">พนักงาน</th>
                  <th className="px-6 py-4 font-semibold">วันที่</th>
                  <th className="px-6 py-4 font-semibold">กะ</th>
                  <th className="px-6 py-4 font-semibold">เวลา</th>
                  <th className="px-6 py-4 font-semibold">หมายเหตุ</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredShifts.map((shift) => {
                  const meta = SHIFT_META[shift.shift_type ?? ""] ?? null;
                  return (
                    <tr key={shift.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div style={gradientStyle(shift.employee_id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {initials(shift.employee_name)}
                          </div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{shift.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textMuted">{formatDateLabel(shift.date)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta?.badge ?? "bg-gray-700/50 text-gray-400"}`}>
                          {(meta?.label ?? shift.shift_type ?? "UNKNOWN").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-textMuted">
                        <span className="flex items-center gap-2"><Clock size={14} className="text-gray-600" /> {shift.start_time} - {shift.end_time}</span>
                      </td>
                      <td className="px-6 py-4 text-textMuted italic">{shift.notes || "-"}</td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(shift)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(shift.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editingShift ? "แก้ไขกะการทำงาน" : "จัดกะใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เลือกพนักงาน</label>
                <select required className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}>
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>

              {/* Shift type — segmented selector */}
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภทกะ</label>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_ORDER.map((type) => {
                    const meta = SHIFT_META[type];
                    const Icon = meta.icon;
                    const active = formData.shiftType === type;
                    return (
                      <button key={type} type="button" onClick={() => setFormData({ ...formData, shiftType: type })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          active ? "border-brandPurple bg-brandPurple/10 text-white" : "border-gray-800 text-textMuted hover:border-gray-700"
                        }`}>
                        <Icon size={18} className={active ? "text-brandPurple" : ""} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่</label>
                <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เวลาเริ่ม</label>
                  <input required type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เวลาสิ้นสุด</label>
                  <input required type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หมายเหตุ</label>
                <textarea rows={2} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ระบุเหตุผลหรือหมายเหตุเพิ่มเติม..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingShift ? "บันทึกการแก้ไข" : "บันทึกจัดกะ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, tint, label, value, suffix }: { icon: React.ReactNode; tint: string; label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
      <div className={`p-3 rounded-xl ${tint}`}>{icon}</div>
      <div>
        <p className="text-textMuted text-xs uppercase font-semibold">{label}</p>
        <p className="text-2xl font-bold text-white">{value}{suffix && <span className="text-base font-medium text-textMuted ml-1">{suffix}</span>}</p>
      </div>
    </div>
  );
}

/** Pure-CSS donut (conic-gradient) showing the Morning/Afternoon/Night split. */
function ShiftDonut({ byType, total }: { byType: Record<string, number>; total: number }) {
  let acc = 0;
  const stops: string[] = [];
  for (const type of SHIFT_ORDER) {
    const count = byType[type] || 0;
    if (total === 0 || count === 0) continue;
    const start = (acc / total) * 100;
    acc += count;
    const end = (acc / total) * 100;
    stops.push(`${SHIFT_META[type].hex} ${start}% ${end}%`);
  }
  const background = total > 0 ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#1f2937 0 100%)";

  return (
    <div className="relative w-28 h-28 shrink-0">
      <div className="w-full h-full rounded-full" style={{ background }} />
      <div className="absolute inset-[14px] rounded-full bg-cardDark flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white leading-none">{total}</span>
        <span className="text-[10px] text-textMuted mt-0.5">กะทั้งหมด</span>
      </div>
    </div>
  );
}

function ShiftCard({ shift, canManage, onEdit, onDelete }: { shift: Shift; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const meta = SHIFT_META[shift.shift_type ?? ""] ?? null;
  const Icon = meta?.icon ?? Clock;
  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl p-4 group hover:border-brandPurple/50 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div style={gradientStyle(shift.employee_id)} className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials(shift.employee_name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{shift.employee_name}</p>
            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta?.badge ?? "bg-gray-700/50 text-gray-400"}`}>
              <Icon size={11} /> {meta?.label ?? shift.shift_type}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={14} /></button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-xs text-textMuted">
        <Clock size={13} className="text-gray-600" /> {shift.start_time} - {shift.end_time}
      </div>
      {shift.notes && <p className="mt-2 text-xs text-textMuted italic line-clamp-2">{shift.notes}</p>}
    </div>
  );
}
