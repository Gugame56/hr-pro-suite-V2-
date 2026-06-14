"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  UserMinus, Clock, CheckCircle2, CalendarClock, DoorOpen,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { Kpi, DonutPanel, StatusPill, STATUS_HEX, type Segment } from "@/lib/dashboardKit";
import { canManage } from "@/lib/permissions";

type Resignation = {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  resignationDate?: string;
  lastWorkingDay?: string;
  reason?: string;
  status?: string;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const formatDate = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

// Whole days from today until the given date (negative = already past).
const daysUntil = (d?: string) => {
  if (!d) return NaN;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return NaN;
  const t = new Date(todayStr());
  return Math.round((date.getTime() - t.getTime()) / 86400000);
};

// Notice period in days between notice date and last working day.
const noticeDays = (r: Resignation) => {
  if (!r.resignationDate || !r.lastWorkingDay) return null;
  const s = new Date(r.resignationDate);
  const e = new Date(r.lastWorkingDay);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
};

export default function ResignationsPage() {
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResignation, setEditingResignation] = useState<Resignation | null>(null);
  const [formData, setFormData] = useState<Resignation>({
    employeeId: "", employeeName: "", resignationDate: "", lastWorkingDay: "", reason: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  // The signed-in user. Employees may only see / file their own resignation;
  // managers & admins see everyone and may file on anyone's behalf.
  const [me, setMe] = useState<{ employeeId: string; name: string; isManager: boolean }>({
    employeeId: "", name: "", isManager: false,
  });

  useEffect(() => {
    let employeeId = "", name = "", isManager = false;
    try {
      const session = JSON.parse(localStorage.getItem("hr_session") || "{}");
      employeeId = (session.employeeId || session.id || "").toString();
      name = session.name || "";
      isManager = canManage(session.role);
    } catch {
      // ignore malformed session
    }
    setMe({ employeeId, name, isManager });
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/resignations");
      const data = await res.json();
      if (Array.isArray(data)) setResignations(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลคำร้องลาออก", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Ownership scope: employees only ever see their own record; managers see all.
  const visibleResignations = useMemo(
    () => (me.isManager ? resignations : resignations.filter((r) => (r.employeeId || "") === me.employeeId)),
    [resignations, me],
  );

  const filteredResignations = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return visibleResignations.filter((r) => {
      const matchesSearch =
        r.employeeName?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.employeeId?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [visibleResignations, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: visibleResignations.length,
    pending: visibleResignations.filter((r) => r.status === "Pending").length,
    approved: visibleResignations.filter((r) => r.status === "Approved").length,
    rejected: visibleResignations.filter((r) => r.status === "Rejected").length,
    upcoming: visibleResignations.filter((r) => {
      const d = daysUntil(r.lastWorkingDay);
      return r.status !== "Rejected" && Number.isFinite(d) && d >= 0 && d <= 30;
    }).length,
  }), [visibleResignations]);

  const statusSegments: Segment[] = useMemo(() => [
    { label: "อนุมัติแล้ว", value: stats.approved, hex: STATUS_HEX.Approved },
    { label: "รอดำเนินการ", value: stats.pending, hex: STATUS_HEX.Pending },
    { label: "ปฏิเสธ", value: stats.rejected, hex: STATUS_HEX.Rejected },
  ].filter((s) => s.value > 0), [stats]);

  // Employees whose last working day is in the future (or today), nearest first.
  const upcomingExits = useMemo(() => {
    return visibleResignations
      .filter((r) => {
        const d = daysUntil(r.lastWorkingDay);
        return r.status !== "Rejected" && Number.isFinite(d) && d >= 0;
      })
      .sort((a, b) => (a.lastWorkingDay || "").localeCompare(b.lastWorkingDay || ""))
      .slice(0, 6);
  }, [visibleResignations]);

  const openAddModal = () => {
    setEditingResignation(null);
    // Employees file for themselves, so prefill (and later lock) their own identity.
    // Managers start blank and pick whom the request is for.
    setFormData({
      employeeId: me.isManager ? "" : me.employeeId,
      employeeName: me.isManager ? "" : me.name,
      resignationDate: "", lastWorkingDay: "", reason: "", status: "Pending",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (resignation: Resignation) => {
    setEditingResignation(resignation);
    setFormData({
      employeeId: resignation.employeeId || "", employeeName: resignation.employeeName || "",
      resignationDate: resignation.resignationDate || "", lastWorkingDay: resignation.lastWorkingDay || "",
      reason: resignation.reason || "", status: resignation.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingResignation ? "PATCH" : "POST";
    // Employees can never file under someone else's name: force the request to
    // their own identity regardless of the form fields. Managers keep what they typed.
    const owner = me.isManager ? {} : { employeeId: me.employeeId, employeeName: me.name };
    const body = editingResignation
      ? { id: editingResignation.id, ...formData, ...owner }
      : { ...formData, ...owner };
    try {
      const res = await fetch("/api/resignations", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingResignation ? "อัปเดตคำร้องลาออกสำเร็จ" : "ส่งคำร้องลาออกสำเร็จ");
      await fetchResignations();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้?")) return;
    try {
      const res = await fetch(`/api/resignations?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบบันทึกการลาออกสำเร็จ");
      await fetchResignations();
    } catch {
      showNotification("เกิดข้อผิดพลาดในการลบ", "error");
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
          <h2 className="text-2xl font-bold text-white">แจ้งลาออก (Resignations)</h2>
          <p className="text-textMuted text-sm">จัดการคำร้องขอลาออกและขั้นตอนการพ้นสภาพพนักงาน</p>
        </div>
        <button onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
          <Plus size={18} /> สร้างคำร้องลาออก
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<UserMinus size={22} />} tint="bg-blue-500/10 text-blue-500" label="คำร้องทั้งหมด" value={stats.total} sub="รายการ" />
        <Kpi icon={<Clock size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="รอดำเนินการ" value={stats.pending} sub="รายการ" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="อนุมัติแล้ว" value={stats.approved} sub="รายการ" />
        <Kpi icon={<CalendarClock size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="พ้นสภาพใน 30 วัน" value={stats.upcoming} sub="คน" />
      </div>

      {/* Distribution + upcoming exits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutPanel title="สัดส่วนคำร้องตามสถานะ" subtitle="แบ่งตามสถานะการพิจารณา" segments={statusSegments} centerLabel="คำร้อง" />

        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><DoorOpen size={16} className="text-brandPurple" /> กำลังจะพ้นสภาพ</h3>
            <span className="text-xs text-textMuted">เรียงตามวันทำงานสุดท้าย</span>
          </div>
          <p className="text-textMuted text-xs mb-4">{upcomingExits.length} คนที่ใกล้ถึงวันทำงานสุดท้าย</p>
          {upcomingExits.length === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <CalendarClock className="text-gray-700 mb-2" size={32} />
              <p className="text-textMuted text-sm">ไม่มีพนักงานที่กำลังจะพ้นสภาพ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {upcomingExits.map((r) => {
                const d = daysUntil(r.lastWorkingDay);
                return (
                  <div key={r.id} className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-3">
                    <div style={gradientStyle(r.employeeId || r.employeeName)} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {initials(r.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{r.employeeName}</p>
                      <p className="text-textMuted text-xs">{formatDate(r.lastWorkingDay)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      d <= 7 ? "bg-brandRed/10 text-brandRed" : "bg-brandOrange/10 text-brandOrange"
                    }`}>
                      {d === 0 ? "วันนี้" : `อีก ${d} วัน`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาชื่อพนักงาน, รหัส, เหตุผล..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">รอดำเนินการ</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Rejected">ปฏิเสธ</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredResignations.length} / {resignations.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูลคำร้องลาออก...</p>
          </div>
        ) : filteredResignations.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ยังไม่มีข้อมูลคำร้องลาออกในขณะนี้</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">พนักงาน</th>
                  <th className="px-6 py-4 font-semibold">วันที่แจ้ง</th>
                  <th className="px-6 py-4 font-semibold">วันทำงานสุดท้าย</th>
                  <th className="px-6 py-4 font-semibold">ระยะแจ้งล่วงหน้า</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredResignations.map((item) => {
                  const notice = noticeDays(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div style={gradientStyle(item.employeeId || item.employeeName)} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {initials(item.employeeName)}
                          </div>
                          <div>
                            <span className="text-white font-medium group-hover:text-brandPurple transition-colors block">{item.employeeName}</span>
                            {item.employeeId && <span className="text-textMuted text-xs">{item.employeeId}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textMuted">{formatDate(item.resignationDate)}</td>
                      <td className="px-6 py-4 text-textMuted">{formatDate(item.lastWorkingDay)}</td>
                      <td className="px-6 py-4 text-textMuted">{notice == null ? "-" : `${notice} วัน`}</td>
                      <td className="px-6 py-4"><StatusPill status={item.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(item)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editingResignation ? "แก้ไขคำร้องลาออก" : "สร้างคำร้องลาออก"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รหัสพนักงาน</label>
                  <input required type="text" readOnly={!me.isManager}
                    className={`w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white ${!me.isManager ? "opacity-60 cursor-not-allowed" : ""}`}
                    value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} placeholder="EMP001" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อพนักงาน</label>
                  <input required type="text" readOnly={!me.isManager}
                    className={`w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white ${!me.isManager ? "opacity-60 cursor-not-allowed" : ""}`}
                    value={formData.employeeName} onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่แจ้งลาออก</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.resignationDate} onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันทำงานสุดท้าย</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.lastWorkingDay} onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เหตุผลการลาออก</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="ระบุเหตุผลในการลาออก..." />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะคำร้อง</label>
                <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Pending">Pending (รออนุมัติ)</option>
                  <option value="Approved">Approved (อนุมัติแล้ว)</option>
                  <option value="Rejected">Rejected (ปฏิเสธ)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingResignation ? "บันทึกการแก้ไข" : "ส่งคำร้องลาออก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
