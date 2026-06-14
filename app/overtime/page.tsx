"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Clock, CheckCircle2, AlertCircle, Timer, XCircle,
} from "lucide-react";
import { Kpi, DonutPanel, StatusPill, STATUS_HEX, type Segment } from "@/lib/dashboardKit";

type Overtime = {
  id?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  hours?: string;
  reason?: string;
  status?: string;
};

export default function OvertimePage() {
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOT, setEditingOT] = useState<Overtime | null>(null);
  const [formData, setFormData] = useState<Overtime>({
    date: "", startTime: "", endTime: "", hours: "", reason: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchOvertimes(); }, []);

  const fetchOvertimes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/overtime?employeeId=${currentEmployeeId}`);
      const data = await res.json();
      if (Array.isArray(data)) setOvertimes(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล OT", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredOT = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return overtimes.filter((ot) => {
      const matchesSearch = ot.reason?.toLowerCase().includes(q) || ot.date?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || ot.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [overtimes, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const totalHours = overtimes.reduce((s, ot) => s + (parseFloat(ot.hours || "") || 0), 0);
    const approved = overtimes.filter((o) => o.status === "Approved").length;
    const pending = overtimes.filter((o) => o.status === "Pending").length;
    const rejected = overtimes.filter((o) => o.status === "Rejected").length;
    const approvedHours = overtimes.filter((o) => o.status === "Approved").reduce((s, ot) => s + (parseFloat(ot.hours || "") || 0), 0);
    return { totalHours, approved, pending, rejected, approvedHours, count: overtimes.length };
  }, [overtimes]);

  const statusSegments: Segment[] = useMemo(() => [
    { label: "อนุมัติแล้ว", value: stats.approved, hex: STATUS_HEX.Approved },
    { label: "รออนุมัติ", value: stats.pending, hex: STATUS_HEX.Pending },
    { label: "ปฏิเสธ", value: stats.rejected, hex: STATUS_HEX.Rejected },
  ].filter((s) => s.value > 0), [stats]);

  const openAddModal = () => {
    setEditingOT(null);
    setFormData({ date: new Date().toISOString().split("T")[0], startTime: "", endTime: "", hours: "", reason: "", status: "Pending" });
    setIsModalOpen(true);
  };

  const openEditModal = (ot: Overtime) => {
    setEditingOT(ot);
    setFormData({
      date: ot.date || "", startTime: ot.startTime || "", endTime: ot.endTime || "",
      hours: ot.hours || "", reason: ot.reason || "", status: ot.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingOT ? "PATCH" : "POST";
    const body = editingOT ? { id: editingOT.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/overtime", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingOT ? "อัปเดตบันทึก OT สำเร็จ" : "ส่งคำขอ OT สำเร็จ");
      await fetchOvertimes();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการ OT นี้?")) return;
    try {
      const res = await fetch(`/api/overtime?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบบันทึก OT สำเร็จ");
      await fetchOvertimes();
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">การทำงานล่วงเวลา (Overtime)</h2>
          <p className="text-textMuted text-sm">บันทึกและจัดการคำขอทำงานล่วงเวลา</p>
        </div>
        <button onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
          <Plus size={18} /> บันทึก OT
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Clock size={22} />} tint="bg-blue-500/10 text-blue-500" label="ชั่วโมง OT รวม" value={`${stats.totalHours.toFixed(1)} ชม.`} sub={`อนุมัติแล้ว ${stats.approvedHours.toFixed(1)} ชม.`} />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="อนุมัติแล้ว" value={stats.approved} sub="รายการ" />
        <Kpi icon={<AlertCircle size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="รออนุมัติ" value={stats.pending} sub="รายการ" />
        <Kpi icon={<Timer size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="เฉลี่ยต่อรายการ" value={`${stats.count ? (stats.totalHours / stats.count).toFixed(1) : "0.0"} ชม.`} />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนคำขอ OT ตามสถานะ" subtitle="แบ่งตามสถานะการอนุมัติ" segments={statusSegments} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาเหตุผล หรือวันที่..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">รออนุมัติ</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Rejected">ปฏิเสธ</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredOT.length} / {overtimes.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredOT.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ไม่พบข้อมูลการทำงานล่วงเวลา</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">วันที่</th>
                  <th className="px-6 py-4 font-semibold">เวลา</th>
                  <th className="px-6 py-4 font-semibold">จำนวนชม.</th>
                  <th className="px-6 py-4 font-semibold">เหตุผล</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredOT.map((ot) => (
                  <tr key={ot.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4 text-white font-medium">{ot.date}</td>
                    <td className="px-6 py-4 text-textMuted">
                      <span className="flex items-center gap-2"><Clock size={14} className="text-gray-600" /> {ot.startTime} - {ot.endTime}</span>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">{ot.hours} ชม.</td>
                    <td className="px-6 py-4 text-textMuted italic truncate max-w-xs">{ot.reason || "-"}</td>
                    <td className="px-6 py-4"><StatusPill status={ot.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(ot)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(ot.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <h3 className="text-xl font-bold text-white">{editingOT ? "แก้ไขบันทึก OT" : "บันทึกการทำงานล่วงเวลา"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จำนวนชั่วโมง</label>
                  <input required type="number" step="0.5" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} placeholder="เช่น 2.5" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending (รออนุมัติ)</option>
                    <option value="Approved">Approved (อนุมัติแล้ว)</option>
                    <option value="Rejected">Rejected (ปฏิเสธ)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เหตุผล/รายละเอียดงาน</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="ระบุรายละเอียดงานที่ทำล่วงเวลา..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingOT ? "บันทึกการแก้ไข" : "บันทึก OT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
