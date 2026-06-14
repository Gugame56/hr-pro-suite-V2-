"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarX, Plus, CheckCircle2, Clock, XCircle, X, Loader2, Search,
  Pencil, Trash2, List, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, CalendarRange,
  Settings2, Save, AlertTriangle, Lock, Users, CalendarCheck, FileSpreadsheet, FileText, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { DonutPanel, STATUS_HEX, type Segment } from "@/lib/dashboardKit";
import { useCanManage } from "@/lib/useCanManage";
import { canManage as roleCanManage } from "@/lib/permissions";
import { exportExcel, exportPdf } from "@/lib/exporters";
import {
  computeQuota, dayCount, hourCount, leaveDays, normalizeLeaveType,
  type LeaveType, type LeaveQuota,
} from "@/lib/leave";

const TH_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const STATUS_TH: Record<string, string> = { Approved: "อนุมัติ", Pending: "รออนุมัติ", Rejected: "ไม่อนุมัติ" };

const LEAVE_TYPE_HEX = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

type DurationType = "fullday" | "hourly";

type Leave = {
  id?: string;
  employeeId?: string;
  leaveType?: string;
  durationType?: DurationType;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  status?: string;
};

type View = "list" | "kanban" | "calendar";

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function isoOf(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
// dayCount / hourCount are shared with the server-side quota engine in lib/leave.
// Human-readable duration for a leave, branching on hourly vs full-day.
function durationLabel(l: Leave) {
  if (l.durationType === "hourly") {
    const h = hourCount(l.startTime, l.endTime);
    return h ? `${h} ชม.` : "—";
  }
  return `${dayCount(l.startDate, l.endDate)} วัน`;
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<View>("list");
  const [cursor, setCursor] = useState(new Date());
  const [formData, setFormData] = useState<Leave>({
    leaveType: "", durationType: "fullday", startDate: "", endDate: "",
    startTime: "", endTime: "", reason: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  // Month picker for the monthly report, as "YYYY-MM" (default: current month).
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const canManage = useCanManage();
  // Resolve the signed-in employee once on mount; quota is computed for them.
  const [currentEmployeeId, setCurrentEmployeeId] = useState("");

  useEffect(() => {
    let empId = "";
    let role = "";
    try {
      const session = JSON.parse(localStorage.getItem("hr_session") || "{}");
      empId = (session.employeeId || session.id || "").toString();
      role = (session.role || "").toLowerCase();
    } catch { /* no session */ }
    setCurrentEmployeeId(empId);
    const manage = roleCanManage(role);
    fetchTypes();
    fetchEmployees(empId);
    // Managers/Admins see the whole organisation; employees see only their own.
    fetchLeaves(manage ? "" : empId);
  }, []);

  const fetchLeaves = async (empId = currentEmployeeId) => {
    setIsLoading(true);
    try {
      const res = await fetch(empId ? `/api/leave?employeeId=${empId}` : "/api/leave");
      const data = await res.json();
      if (Array.isArray(data)) setLeaves(data);
    } catch {
      showNotification("Error fetching leave requests", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await fetch("/api/leave-types");
      const data = await res.json();
      if (Array.isArray(data)) {
        const types = data.map(normalizeLeaveType);
        setLeaveTypes(types);
        // Default the form to the first active type.
        const firstActive = types.find((t) => t.active);
        if (firstActive) setFormData((f) => ({ ...f, leaveType: f.leaveType || firstActive.name }));
      }
    } catch { /* leave dropdown falls back to empty */ }
  };

  // Load the employee roster: drives the headcount KPI, the id→name map for the
  // report, and the signed-in user's hire date (for the 1-year vacation gate).
  const fetchEmployees = async (empId: string) => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
        const me = data.find((e: any) => (e.id || "").toString() === empId.toString());
        setStartDate(me?.startDate || undefined);
      }
    } catch { /* tenure shown as unknown; headcount falls back to 0 */ }
  };

  const employeeName = (id?: string) => {
    const e = employees.find((x) => (x.id || "").toString() === (id || "").toString());
    return e?.name || e?.nickname || id || "-";
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredLeaves = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return leaves.filter((leave) =>
      leave.leaveType?.toLowerCase().includes(q) || leave.reason?.toLowerCase().includes(q)
    );
  }, [leaves, searchTerm]);

  const summary = useMemo(() => ({
    pending: leaves.filter((l) => l.status === "Pending").length,
    approved: leaves.filter((l) => l.status === "Approved").length,
    rejected: leaves.filter((l) => l.status === "Rejected").length,
    totalDays: leaves.filter((l) => l.status === "Approved").reduce((acc, l) => acc + dayCount(l.startDate, l.endDate), 0),
  }), [leaves]);

  const statusSegments: Segment[] = useMemo(() => [
    { label: "อนุมัติแล้ว", value: summary.approved, hex: STATUS_HEX.Approved },
    { label: "รออนุมัติ", value: summary.pending, hex: STATUS_HEX.Pending },
    { label: "ไม่อนุมัติ", value: summary.rejected, hex: STATUS_HEX.Rejected },
  ].filter((s) => s.value > 0), [summary]);

  const typeSegments: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of leaves) {
      const key = l.leaveType || "อื่นๆ";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value], i) => ({ label, value, hex: LEAVE_TYPE_HEX[i % LEAVE_TYPE_HEX.length] }))
      .sort((a, b) => b.value - a.value);
  }, [leaves]);

  const activeTypes = useMemo(() => leaveTypes.filter((t) => t.active), [leaveTypes]);

  // Per-type entitlement/remaining for the current employee (this calendar year).
  const quotas: LeaveQuota[] = useMemo(
    () => activeTypes.map((t) => computeQuota(t, startDate, leaves)),
    [activeTypes, startDate, leaves],
  );
  const quotaFor = (typeName?: string) => quotas.find((q) => q.type === typeName);

  // ---- Dashboard analytics (org-wide when manager, otherwise the user's own) ----

  // Employees with an Approved leave covering today.
  const onLeaveToday = useMemo(() => {
    const today = isoOf(new Date());
    const ids = new Set<string>();
    leaves.forEach((l) => {
      if (l.status !== "Approved" || !l.startDate) return;
      const end = l.endDate || l.startDate;
      if (l.startDate <= today && today <= end) ids.add((l.employeeId || "").toString());
    });
    return ids.size;
  }, [leaves]);

  const reportYear = Number(reportMonth.slice(0, 4));

  // Approved leave days per month for the selected year (req #6: รายเดือน/รายปี).
  const monthlyChart = useMemo(() => {
    const totals = new Array(12).fill(0);
    leaves.forEach((l) => {
      if (l.status !== "Approved" || !l.startDate) return;
      const d = new Date(l.startDate);
      if (isNaN(d.getTime()) || d.getFullYear() !== reportYear) return;
      totals[d.getMonth()] += leaveDays(l);
    });
    return totals.map((days, i) => ({ month: TH_MONTHS_SHORT[i], days: Math.round(days * 100) / 100 }));
  }, [leaves, reportYear]);
  const hasYearLeave = useMemo(() => monthlyChart.some((m) => m.days > 0), [monthlyChart]);

  // Rows for the monthly report/export — any leave starting in the chosen month.
  const reportRows = useMemo(() => {
    return leaves
      .filter((l) => (l.startDate || "").slice(0, 7) === reportMonth)
      .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))
      .map((l) => ({
        employeeName: employeeName(l.employeeId),
        leaveType: l.leaveType || "-",
        duration: durationLabel(l),
        dateRange: l.durationType === "hourly"
          ? `${l.startDate} (${l.startTime}–${l.endTime})`
          : (l.endDate && l.endDate !== l.startDate ? `${l.startDate} ถึง ${l.endDate}` : l.startDate || "-"),
        statusTh: STATUS_TH[l.status || "Pending"] || l.status,
        status: l.status,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves, reportMonth, employees]);

  const REPORT_COLUMNS = [
    { key: "employeeName", label: "ชื่อพนักงาน" },
    { key: "leaveType", label: "ประเภทการลา" },
    { key: "duration", label: "จำนวน" },
    { key: "dateRange", label: "วันที่ลา" },
    { key: "statusTh", label: "สถานะ" },
  ];

  const reportTitle = () => {
    const [y, m] = reportMonth.split("-");
    return `รายงานการลา ${TH_MONTHS_SHORT[Number(m) - 1]} ${Number(y) + 543}`;
  };
  const downloadExcel = () => {
    if (reportRows.length === 0) { showNotification("ไม่มีข้อมูลการลาในเดือนที่เลือก", "error"); return; }
    exportExcel(reportRows, REPORT_COLUMNS, `${reportTitle()}.xls`);
  };
  const downloadPdf = () => {
    if (reportRows.length === 0) { showNotification("ไม่มีข้อมูลการลาในเดือนที่เลือก", "error"); return; }
    exportPdf(reportTitle(), reportRows, REPORT_COLUMNS);
  };

  const openAddModal = () => {
    setEditingLeave(null);
    setFormData({
      leaveType: activeTypes[0]?.name || "", durationType: "fullday", startDate: "", endDate: "",
      startTime: "", endTime: "", reason: "", status: "Pending",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (leave: Leave) => {
    setEditingLeave(leave);
    setFormData({
      leaveType: leave.leaveType || activeTypes[0]?.name || "", durationType: leave.durationType || "fullday",
      startDate: leave.startDate || "", endDate: leave.endDate || "",
      startTime: leave.startTime || "", endTime: leave.endTime || "",
      reason: leave.reason || "", status: leave.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Normalize by mode: hourly uses a single date + time range; full-day uses a date range.
    const isHourly = formData.durationType === "hourly";
    if (isHourly && hourCount(formData.startTime, formData.endTime) <= 0) {
      showNotification("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น", "error");
      return;
    }
    const payload: Leave = isHourly
      ? { ...formData, endDate: formData.startDate }
      : { ...formData, startTime: "", endTime: "" };

    // Pre-flight quota check (the server re-validates and is the real boundary).
    if (!editingLeave) {
      const q = quotaFor(formData.leaveType);
      const need = leaveDays(payload);
      if (q && !q.eligible) {
        const span = q.minTenureMonths % 12 === 0 ? `${q.minTenureMonths / 12} ปี` : `${q.minTenureMonths} เดือน`;
        showNotification(`ยังไม่ได้รับสิทธิ์ "${q.type}" — ต้องทำงานครบ ${span}`, "error");
        return;
      }
      if (q && !q.unlimited && q.used + q.pending + need > q.maxDays + 1e-9) {
        showNotification(`คำขอเกินสิทธิคงเหลือ "${q.type}" — เหลือ ${Math.max(0, q.maxDays - q.used - q.pending)} วัน`, "error");
        return;
      }
    }

    const method = editingLeave ? "PATCH" : "POST";
    const body = editingLeave ? { id: editingLeave.id, ...payload } : { ...payload, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/leave", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Save failed");
      showNotification(editingLeave ? "อัปเดตคำขอลาสำเร็จ" : "ส่งคำขอลาสำเร็จ");
      await fetchLeaves();
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification(err?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const updateStatus = async (id: string | undefined, status: string) => {
    if (!id) return;
    // Optimistic update.
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Update failed");
      showNotification(status === "Approved" ? "อนุมัติคำขอลาแล้ว" : "ปฏิเสธคำขอลาแล้ว");
    } catch (err: any) {
      showNotification(err?.message || "อัปเดตสถานะไม่สำเร็จ", "error");
      await fetchLeaves(); // roll back the optimistic change
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบคำขอลาหยุดนี้?")) return;
    try {
      const res = await fetch(`/api/leave?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบคำขอลาสำเร็จ");
      await fetchLeaves();
    } catch {
      showNotification("เกิดข้อผิดพลาดในการลบข้อมูล", "error");
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">การลา (Leave Management)</h2>
          <p className="text-textMuted text-sm">ตรวจสอบโควตาและส่งคำขอลาหยุด</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setTypesModalOpen(true)}
              className="bg-cardDark border border-gray-700 hover:border-brandPurple text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Settings2 size={18} /> ตั้งค่าประเภทการลา
            </button>
          )}
        <button
          onClick={openAddModal}
          className="bg-brandPurple hover:bg-purple-600 active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-brandPurple/20"
        >
          <Plus size={18} /> ขอลาหยุด
        </button>
        </div>
      </div>

      {/* Leave entitlement / remaining balance for the signed-in employee */}
      {quotas.length > 0 && (
        <div>
          <p className="text-xs text-textMuted font-semibold uppercase tracking-wider mb-2">สิทธิวันลาคงเหลือ (ปี {new Date().getFullYear() + 543})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {quotas.map((q, i) => <QuotaCard key={q.type} q={q} hex={LEAVE_TYPE_HEX[i % LEAVE_TYPE_HEX.length]} />)}
          </div>
        </div>
      )}

      {/* Summary cards — managers see org-wide KPIs, employees see their own */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canManage ? (
          <>
            <LeaveStat icon={<Users size={20} />} label="พนักงานทั้งหมด" value={employees.length} color="brandPurple" />
            <LeaveStat icon={<CalendarCheck size={20} />} label="ลาวันนี้" value={onLeaveToday} color="brandBlue" />
            <LeaveStat icon={<Clock size={20} />} label="คำขอรออนุมัติ" value={summary.pending} color="brandOrange" />
            <LeaveStat icon={<CheckCircle2 size={20} />} label="อนุมัติแล้ว" value={summary.approved} color="brandGreen" />
          </>
        ) : (
          <>
            <LeaveStat icon={<Clock size={20} />} label="รออนุมัติ" value={summary.pending} color="brandOrange" />
            <LeaveStat icon={<CheckCircle2 size={20} />} label="อนุมัติแล้ว" value={summary.approved} color="brandGreen" />
            <LeaveStat icon={<XCircle size={20} />} label="ไม่อนุมัติ" value={summary.rejected} color="brandRed" />
            <LeaveStat icon={<CalendarRange size={20} />} label="วันลารวม" value={summary.totalDays} color="brandPurple" />
          </>
        )}
      </div>

      {/* Analytics dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutPanel title="สัดส่วนคำขอลาตามสถานะ" subtitle="แบ่งตามสถานะการอนุมัติ" segments={statusSegments} centerLabel="คำขอ" />
        <DonutPanel title="สัดส่วนตามประเภทการลา" subtitle="จำนวนคำขอแยกตามประเภท" segments={typeSegments} centerLabel="คำขอ" />
      </div>

      {/* Monthly leave trend (approved days per month, selected year) */}
      <div className="bg-cardDark border border-gray-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-brandPurple" size={18} /> วันลาที่อนุมัติรายเดือน · ปี {reportYear + 543}
          </h3>
        </div>
        <div className="h-60">
          {hasYearLeave ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2430" vertical={false} />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(139,92,246,0.08)" }} contentStyle={{ background: "#151923", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 }} formatter={(v: any) => [`${v} วัน`, "วันลา"]} />
                <Bar dataKey="days" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {monthlyChart.map((_, i) => <Cell key={i} fill={LEAVE_TYPE_HEX[i % LEAVE_TYPE_HEX.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-textMuted text-sm italic">ยังไม่มีวันลาที่อนุมัติในปีนี้</div>
          )}
        </div>
      </div>

      {/* Monthly report + export — Admin/Manager only (req #5) */}
      {canManage && (
        <div className="bg-cardDark border border-gray-800 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="text-brandPurple" size={18} /> รายงานการลารายเดือน
            </h3>
            <div className="flex items-center gap-2">
              <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}
                className="bg-cardDark border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brandPurple" />
              <button onClick={downloadExcel} className="flex items-center gap-1.5 bg-brandGreen/10 text-brandGreen hover:bg-brandGreen hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                <FileSpreadsheet size={15} /> Excel
              </button>
              <button onClick={downloadPdf} className="flex items-center gap-1.5 bg-brandRed/10 text-brandRed hover:bg-brandRed hover:text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                <FileText size={15} /> PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">ชื่อพนักงาน</th>
                  <th className="px-4 py-3 font-semibold">ประเภทการลา</th>
                  <th className="px-4 py-3 font-semibold">จำนวน</th>
                  <th className="px-4 py-3 font-semibold">วันที่ลา</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {reportRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-textMuted italic">ไม่มีข้อมูลการลาในเดือนที่เลือก</td></tr>
                ) : (
                  reportRows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-800/20">
                      <td className="px-4 py-2.5 text-white font-medium">{r.employeeName}</td>
                      <td className="px-4 py-2.5 text-textMuted">{r.leaveType}</td>
                      <td className="px-4 py-2.5 text-textMuted">{r.duration}</td>
                      <td className="px-4 py-2.5 text-textMuted">{r.dateRange}</td>
                      <td className="px-4 py-2.5"><LeaveStatus status={r.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-textMuted mt-2">รวม {reportRows.length} รายการ • ดาวน์โหลดเป็น Excel หรือ PDF ได้</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาประเภทการลา หรือเหตุผล..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-cardDark border border-gray-800 rounded-xl p-1 self-start">
          <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={<List size={16} />} label="รายการ" />
          <ViewBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid size={16} />} label="Kanban" />
          <ViewBtn active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays size={16} />} label="ปฏิทิน" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted">กำลังโหลดข้อมูล...</p>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard leaves={filteredLeaves} canManage={canManage} onApprove={(id) => updateStatus(id, "Approved")} onReject={(id) => updateStatus(id, "Rejected")} onEdit={openEditModal} />
      ) : view === "calendar" ? (
        <LeaveCalendar cursor={cursor} setCursor={setCursor} leaves={filteredLeaves} />
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {filteredLeaves.length === 0 ? (
              <div className="p-20 text-center"><p className="text-textMuted">ไม่พบประวัติการลา</p></div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                    {canManage && <th className="px-6 py-4 font-semibold">พนักงาน</th>}
                    <th className="px-6 py-4 font-semibold">ประเภทการลา</th>
                    <th className="px-6 py-4 font-semibold">วันที่</th>
                    <th className="px-6 py-4 font-semibold">จำนวน</th>
                    <th className="px-6 py-4 font-semibold">สถานะ</th>
                    <th className="px-6 py-4 font-semibold">เหตุผล</th>
                    <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {filteredLeaves.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800/20 transition-colors group">
                      {canManage && <td className="px-6 py-4 font-medium text-white">{employeeName(item.employeeId)}</td>}
                      <td className="px-6 py-4 font-medium text-white">{item.leaveType}</td>
                      <td className="px-6 py-4 text-textMuted">
                        {item.durationType === "hourly"
                          ? <>{item.startDate} <span className="text-gray-500">({item.startTime}–{item.endTime})</span></>
                          : <>{item.startDate} ถึง {item.endDate}</>}
                      </td>
                      <td className="px-6 py-4 text-textMuted">{durationLabel(item)}</td>
                      <td className="px-6 py-4"><LeaveStatus status={item.status} /></td>
                      <td className="px-6 py-4 text-textMuted italic truncate max-w-xs">{item.reason}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {canManage && item.status === "Pending" && (
                            <>
                              <button onClick={() => updateStatus(item.id, "Approved")} title="อนุมัติ"
                                className="p-2 rounded-lg bg-brandGreen/10 text-brandGreen hover:bg-brandGreen hover:text-white transition-colors"><CheckCircle2 size={16} /></button>
                              <button onClick={() => updateStatus(item.id, "Rejected")} title="ปฏิเสธ"
                                className="p-2 rounded-lg bg-brandRed/10 text-brandRed hover:bg-brandRed hover:text-white transition-colors"><XCircle size={16} /></button>
                            </>
                          )}
                          <button onClick={() => openEditModal(item)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarX className="text-brandPurple" size={24} />
                {editingLeave ? "แก้ไขคำขอลา" : "ส่งคำขอลาหยุด"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textMuted uppercase mb-1">ประเภทการลา</label>
                <select
                  className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white appearance-none"
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                >
                  {activeTypes.length === 0 && <option value="">— ยังไม่มีประเภทการลา —</option>}
                  {activeTypes.map((t) => <option key={t.id || t.name} value={t.name}>{t.name}</option>)}
                </select>
                {(() => {
                  const q = quotaFor(formData.leaveType);
                  if (!q) return null;
                  if (!q.eligible) {
                    const span = q.minTenureMonths % 12 === 0 ? `${q.minTenureMonths / 12} ปี` : `${q.minTenureMonths} เดือน`;
                    return <p className="text-[11px] text-brandRed mt-1.5 flex items-center gap-1"><Lock size={12} /> ยังไม่ได้รับสิทธิ์ — ต้องทำงานครบ {span}</p>;
                  }
                  return (
                    <p className="text-[11px] text-textMuted mt-1.5">
                      คงเหลือ <span className="text-brandGreen font-bold">{q.unlimited ? "ไม่จำกัด" : `${q.remaining} วัน`}</span>
                      {!q.unlimited && <span className="text-gray-500"> จากสิทธิ์ {q.maxDays} วัน/ปี</span>}
                      {!q.tenureKnown && q.minTenureMonths > 0 && <span className="text-brandOrange"> • ไม่ทราบวันเริ่มงาน</span>}
                    </p>
                  );
                })()}
              </div>
              <div>
                <label className="block text-xs font-semibold text-textMuted uppercase mb-1">รูปแบบการลา</label>
                <div className="flex bg-gray-900/40 border border-gray-800 rounded-lg p-1">
                  <DurationTab active={formData.durationType !== "hourly"} onClick={() => setFormData({ ...formData, durationType: "fullday" })}
                    icon={<CalendarDays size={14} />} label="ลาเต็มวัน" />
                  <DurationTab active={formData.durationType === "hourly"} onClick={() => setFormData({ ...formData, durationType: "hourly" })}
                    icon={<Clock size={14} />} label="ลารายชั่วโมง" />
                </div>
              </div>

              {formData.durationType === "hourly" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-textMuted uppercase mb-1">วันที่ลา</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                      value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-textMuted uppercase mb-1">เวลาเริ่มต้น</label>
                      <input required type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                        value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-textMuted uppercase mb-1">เวลาสิ้นสุด</label>
                      <input required type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                        value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-textMuted uppercase mb-1">ตั้งแต่วันที่</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                      value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-textMuted uppercase mb-1">ถึงวันที่</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                      value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                  </div>
                </div>
              )}

              {/* Auto-calculated duration, saved with the request. */}
              <div className="flex items-center justify-between bg-brandPurple/10 border border-brandPurple/20 rounded-lg px-4 py-2.5">
                <span className="text-xs font-semibold text-textMuted uppercase">จำนวนที่ใช้</span>
                <span className="text-sm font-bold text-brandPurple">{durationLabel(formData)}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-textMuted uppercase mb-1">เหตุผลการลา</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white"
                  placeholder="ระบุเหตุผลในการขอลา..." value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
              </div>
              {editingLeave && canManage && (
                <div>
                  <label className="block text-xs font-semibold text-textMuted uppercase mb-1">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple transition-colors text-white appearance-none"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending (รออนุมัติ)</option>
                    <option value="Approved">Approved (อนุมัติแล้ว)</option>
                    <option value="Rejected">Rejected (ปฏิเสธ)</option>
                  </select>
                </div>
              )}
              <div className="pt-4">
                <button type="submit" className="w-full bg-brandPurple hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager-only: configure leave types (req #1) */}
      {typesModalOpen && (
        <LeaveTypesManager
          types={leaveTypes}
          onClose={() => setTypesModalOpen(false)}
          onChanged={fetchTypes}
          notify={showNotification}
        />
      )}
    </div>
  );
}

// Compact balance card for one leave type.
function QuotaCard({ q, hex }: { q: LeaveQuota; hex: string }) {
  const blocked = !q.eligible;
  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
        <span className="text-sm font-semibold text-white truncate">{q.type}</span>
      </div>
      {blocked ? (
        <p className="text-[11px] text-brandRed flex items-center gap-1"><Lock size={12} /> ยังไม่ได้รับสิทธิ์</p>
      ) : q.unlimited ? (
        <p className="text-lg font-bold text-brandGreen">ไม่จำกัด</p>
      ) : (
        <>
          <p className="text-lg font-bold text-white">{q.remaining}<span className="text-xs text-textMuted font-normal"> / {q.maxDays} วัน</span></p>
          <p className="text-[10px] text-textMuted mt-0.5">ใช้ไป {q.used} • รออนุมัติ {q.pending}</p>
        </>
      )}
    </div>
  );
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${active ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}>
      {icon} {label}
    </button>
  );
}

function DurationTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-colors ${active ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}>
      {icon} {label}
    </button>
  );
}

const LEAVE_STAT_ACCENT: Record<string, { bg: string; text: string }> = {
  brandOrange: { bg: "bg-brandOrange/10", text: "text-brandOrange" },
  brandGreen: { bg: "bg-brandGreen/10", text: "text-brandGreen" },
  brandRed: { bg: "bg-brandRed/10", text: "text-brandRed" },
  brandPurple: { bg: "bg-brandPurple/10", text: "text-brandPurple" },
};

function LeaveStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const a = LEAVE_STAT_ACCENT[color] ?? LEAVE_STAT_ACCENT.brandPurple;
  return (
    <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${a.bg} ${a.text}`}>{icon}</div>
      <div>
        <p className="text-textMuted text-xs font-semibold uppercase">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function LeaveStatus({ status }: { status?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${
      status === "Approved" ? "text-brandGreen" : status === "Rejected" ? "text-brandRed" : "text-brandOrange"
    }`}>
      {status === "Approved" ? <CheckCircle2 size={14} /> : status === "Rejected" ? <XCircle size={14} /> : <Clock size={14} />}
      {status}
    </span>
  );
}

function KanbanBoard({
  leaves, canManage, onApprove, onReject, onEdit,
}: {
  leaves: Leave[];
  canManage: boolean;
  onApprove: (id?: string) => void;
  onReject: (id?: string) => void;
  onEdit: (l: Leave) => void;
}) {
  const cols = [
    { key: "Pending", title: "รออนุมัติ", color: "brandOrange", dot: "bg-brandOrange" },
    { key: "Approved", title: "อนุมัติแล้ว", color: "brandGreen", dot: "bg-brandGreen" },
    { key: "Rejected", title: "ไม่อนุมัติ", color: "brandRed", dot: "bg-brandRed" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cols.map((col) => {
        const items = leaves.filter((l) => (l.status || "Pending") === col.key);
        return (
          <div key={col.key} className="bg-cardDark border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} /> {col.title}
              </h4>
              <span className="text-xs text-textMuted bg-gray-800/60 px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="space-y-3 min-h-[100px]">
              {items.length === 0 ? (
                <p className="text-xs text-textMuted italic text-center py-6">ไม่มีรายการ</p>
              ) : (
                items.map((l) => (
                  <div key={l.id} className="bg-gray-900/40 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{l.leaveType}</span>
                      <button onClick={() => onEdit(l)} className="text-gray-500 hover:text-white"><Pencil size={13} /></button>
                    </div>
                    <p className="text-[11px] text-textMuted mt-1">
                      {l.durationType === "hourly"
                        ? `${l.startDate} • ${l.startTime}–${l.endTime}`
                        : `${l.startDate} → ${l.endDate}`} • {durationLabel(l)}
                    </p>
                    {l.reason && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 italic">{l.reason}</p>}
                    {canManage && col.key === "Pending" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => onApprove(l.id)} className="flex-1 flex items-center justify-center gap-1 bg-brandGreen/10 text-brandGreen hover:bg-brandGreen hover:text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                          <CheckCircle2 size={13} /> อนุมัติ
                        </button>
                        <button onClick={() => onReject(l.id)} className="flex-1 flex items-center justify-center gap-1 bg-brandRed/10 text-brandRed hover:bg-brandRed hover:text-white text-xs font-bold py-1.5 rounded-lg transition-colors">
                          <XCircle size={13} /> ปฏิเสธ
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaveCalendar({ cursor, setCursor, leaves }: { cursor: Date; setCursor: (d: Date) => void; leaves: Leave[] }) {
  const todayIso = isoOf(new Date());

  // Build map of date -> leaves covering that date (approved/pending only shown).
  const byDate: Record<string, Leave[]> = {};
  leaves.forEach((l) => {
    if (!l.startDate) return;
    const s = new Date(l.startDate);
    const e = l.endDate ? new Date(l.endDate) : s;
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const iso = isoOf(d);
      (byDate[iso] ??= []).push(l);
    }
  });

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startPad = first.getDay();
  const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const shift = (dir: number) => {
    const d = new Date(cursor); d.setMonth(cursor.getMonth() + dir); setCursor(d);
  };

  const color = (l: Leave) =>
    l.status === "Approved" ? "bg-brandGreen/20 text-brandGreen" :
    l.status === "Rejected" ? "bg-brandRed/20 text-brandRed" : "bg-brandOrange/20 text-brandOrange";

  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-gray-800 text-textMuted hover:text-white"><ChevronLeft size={18} /></button>
          <span className="text-white font-bold text-sm min-w-[150px] text-center">{TH_MONTHS[cursor.getMonth()]} {cursor.getFullYear() + 543}</span>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-gray-800 text-textMuted hover:text-white"><ChevronRight size={18} /></button>
          <button onClick={() => setCursor(new Date())} className="ml-1 text-xs text-brandPurple hover:underline">วันนี้</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {TH_DOW.map((d) => <div key={d} className="text-center text-[10px] font-bold text-textMuted uppercase py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = isoOf(d);
          const items = byDate[iso] || [];
          const isToday = iso === todayIso;
          return (
            <div key={iso} className={`min-h-20 rounded-lg p-1.5 bg-gray-900/30 ${isToday ? "ring-2 ring-brandPurple" : "border border-gray-800/50"}`}>
              <span className={`text-xs font-bold ${isToday ? "text-brandPurple" : "text-gray-400"}`}>{d.getDate()}</span>
              <div className="space-y-0.5 mt-1">
                {items.slice(0, 2).map((l, k) => (
                  <div key={k} className={`text-[9px] px-1 py-0.5 rounded truncate ${color(l)}`} title={`${l.leaveType} (${l.status})`}>
                    {l.leaveType}
                  </div>
                ))}
                {items.length > 2 && <div className="text-[9px] text-textMuted">+{items.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Admin/Manager CRUD for the leave-type catalogue (req #1). Writes go through
// /api/leave-types, which is guarded server-side by requireManager.
function LeaveTypesManager({
  types, onClose, onChanged, notify,
}: {
  types: LeaveType[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  notify: (m: string, t?: string) => void;
}) {
  const blank: LeaveType = { name: "", maxDays: 0, minTenureMonths: 0, paid: true, active: true, description: "" };
  const [rows, setRows] = useState<LeaveType[]>(types);
  const [draft, setDraft] = useState<LeaveType>(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setRows(types); }, [types]);

  const patchRow = (i: number, patch: Partial<LeaveType>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const saveRow = async (t: LeaveType) => {
    if (!t.name.trim()) { notify("กรุณาระบุชื่อประเภทการลา", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/leave-types", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "บันทึกไม่สำเร็จ");
      notify("บันทึกประเภทการลาแล้ว");
      await onChanged();
    } catch (e: any) { notify(e?.message || "บันทึกไม่สำเร็จ", "error"); }
    finally { setBusy(false); }
  };

  const addRow = async () => {
    if (!draft.name.trim()) { notify("กรุณาระบุชื่อประเภทการลา", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/leave-types", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "เพิ่มไม่สำเร็จ");
      notify("เพิ่มประเภทการลาแล้ว");
      setDraft(blank);
      await onChanged();
    } catch (e: any) { notify(e?.message || "เพิ่มไม่สำเร็จ", "error"); }
    finally { setBusy(false); }
  };

  const removeRow = async (t: LeaveType) => {
    if (!t.id || !confirm(`ลบประเภทการลา "${t.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leave-types?id=${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      notify("ลบประเภทการลาแล้ว");
      await onChanged();
    } catch (e: any) { notify(e?.message || "ลบไม่สำเร็จ", "error"); }
    finally { setBusy(false); }
  };

  const numCls = "w-20 bg-cardDark border border-gray-800 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brandPurple";
  const txtCls = "flex-1 min-w-0 bg-cardDark border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brandPurple";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cardDark border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Settings2 className="text-brandPurple" size={20} /> ตั้งค่าประเภทการลา</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar">
          <div className="hidden md:flex items-center gap-2 px-1 text-[10px] uppercase tracking-wider text-textMuted font-semibold">
            <span className="flex-1">ชื่อประเภท</span>
            <span className="w-20 text-center">วัน/ปี</span>
            <span className="w-24 text-center">ครบ (เดือน)</span>
            <span className="w-16 text-center">เปิดใช้</span>
            <span className="w-16" />
          </div>

          {rows.map((t, i) => (
            <div key={t.id || i} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-gray-900/30 border border-gray-800 rounded-xl p-2.5">
              <input className={txtCls} value={t.name} onChange={(e) => patchRow(i, { name: e.target.value })} placeholder="ชื่อประเภท" />
              <input type="number" min={0} className={numCls} value={t.maxDays} onChange={(e) => patchRow(i, { maxDays: Number(e.target.value) })} title="วันสูงสุดต่อปี (0 = ไม่จำกัด)" />
              <input type="number" min={0} className={numCls} value={t.minTenureMonths} onChange={(e) => patchRow(i, { minTenureMonths: Number(e.target.value) })} title="อายุงานขั้นต่ำ (เดือน)" />
              <button type="button" onClick={() => patchRow(i, { active: !t.active })}
                className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${t.active ? "bg-brandGreen" : "bg-gray-700"}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${t.active ? "translate-x-6" : ""}`} />
              </button>
              <div className="flex gap-1 shrink-0">
                <button type="button" disabled={busy} onClick={() => saveRow(t)} title="บันทึก"
                  className="p-2 rounded-lg bg-brandPurple/10 text-brandPurple hover:bg-brandPurple hover:text-white transition-colors disabled:opacity-50"><Save size={15} /></button>
                <button type="button" disabled={busy} onClick={() => removeRow(t)} title="ลบ"
                  className="p-2 rounded-lg bg-brandRed/10 text-brandRed hover:bg-brandRed hover:text-white transition-colors disabled:opacity-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}

          {/* Add new */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 border border-dashed border-gray-700 rounded-xl p-2.5">
            <input className={txtCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="+ ประเภทการลาใหม่" />
            <input type="number" min={0} className={numCls} value={draft.maxDays} onChange={(e) => setDraft({ ...draft, maxDays: Number(e.target.value) })} title="วันสูงสุดต่อปี" />
            <input type="number" min={0} className={numCls} value={draft.minTenureMonths} onChange={(e) => setDraft({ ...draft, minTenureMonths: Number(e.target.value) })} title="อายุงานขั้นต่ำ (เดือน)" />
            <span className="w-12 shrink-0" />
            <button type="button" disabled={busy} onClick={addRow}
              className="p-2 rounded-lg bg-brandGreen/10 text-brandGreen hover:bg-brandGreen hover:text-white transition-colors shrink-0 disabled:opacity-50"><Plus size={15} /></button>
          </div>

          <p className="text-[11px] text-textMuted flex items-start gap-1.5 pt-1">
            <AlertTriangle size={13} className="text-brandOrange mt-0.5 shrink-0" />
            "วัน/ปี" = สิทธิวันลาสูงสุดต่อปี (0 = ไม่จำกัด) • "ครบ (เดือน)" = อายุงานขั้นต่ำก่อนได้สิทธิ์ เช่น ลาพักร้อนใส่ 12 (ครบ 1 ปี)
          </p>
        </div>
      </div>
    </div>
  );
}
