"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2,
  X, AlertTriangle, ShieldAlert, Gavel, Scale, CheckCircle2,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, type Segment } from "@/lib/dashboardKit";

// Incident severity palette (donut + pills).
const INCIDENT_META: Record<string, { label: string; hex: string; pill: string }> = {
  Warning: { label: "ตักเตือนด้วยวาจา", hex: "#6b7280", pill: "bg-gray-700/50 text-gray-400" },
  "Written Warning": { label: "ตักเตือนลายลักษณ์อักษร", hex: "#f59e0b", pill: "bg-amber-500/20 text-amber-500" },
  "Final Warning": { label: "ตักเตือนครั้งสุดท้าย", hex: "#f97316", pill: "bg-orange-500/20 text-orange-500" },
  Termination: { label: "เลิกจ้าง", hex: "#ef4444", pill: "bg-red-500 text-white" },
};

const STATUS_META: Record<string, { label: string; pill: string }> = {
  Open: { label: "ยังไม่จบเคส", pill: "bg-brandPurple/10 text-brandPurple" },
  Closed: { label: "ปิดเคสแล้ว", pill: "bg-brandGreen/10 text-brandGreen" },
  Appealed: { label: "อยู่ระหว่างอุทธรณ์", pill: "bg-blue-500/10 text-blue-500" },
};

export default function DisciplinePage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    incidentDate: "",
    incidentType: "Warning",
    description: "",
    actionTaken: "",
    status: "Open"
  });
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/discipline');
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch (err) {
      showNotification("Error fetching discipline records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return records.filter(r => {
      const matchesSearch =
        r.employeeName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.incidentType?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    open: records.filter(r => r.status === "Open").length,
    closed: records.filter(r => r.status === "Closed").length,
    severe: records.filter(r => r.incidentType === "Final Warning" || r.incidentType === "Termination").length,
  }), [records]);

  const byType: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      const key = r.incidentType || "Warning";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({
        label: INCIDENT_META[key]?.label ?? key,
        value,
        hex: INCIDENT_META[key]?.hex ?? "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      employeeId: "",
      employeeName: "",
      incidentDate: "",
      incidentType: "Warning",
      description: "",
      actionTaken: "",
      status: "Open"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setEditingRecord(record);
    setFormData({
      employeeId: record.employeeId || "",
      employeeName: record.employeeName || "",
      incidentDate: record.incidentDate || "",
      incidentType: record.incidentType || "Warning",
      description: record.description || "",
      actionTaken: record.actionTaken || "",
      status: record.status || "Open"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editingRecord ? 'PATCH' : 'POST';
    const body = editingRecord ? { id: editingRecord.id, ...formData } : formData;

    try {
      const res = await fetch('/api/discipline', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      showNotification(editingRecord ? "อัปเดตบันทึกวินัยสำเร็จ" : "เพิ่มบันทึกวินัยสำเร็จ");
      await fetchRecords();
      setIsModalOpen(false);
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกนี้?")) return;

    try {
      const res = await fetch(`/api/discipline?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showNotification("ลบบันทึกวินัยสำเร็จ");
      await fetchRecords();
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-brandGreen'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">การลงโทษทางวินัย (Discipline)</h2>
          <p className="text-textMuted text-sm">บันทึกและจัดการการกระทำผิดวินัยของพนักงาน</p>
        </div>
        {canManage && (
          <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
        >
          <Plus size={18} />
          บันทึกการกระทำผิด
        </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<ShieldAlert size={22} />} tint="bg-blue-500/10 text-blue-500" label="รายการทั้งหมด" value={stats.total} sub="รายการ" />
        <Kpi icon={<AlertTriangle size={22} />} tint="bg-amber-500/10 text-amber-500" label="รอดำเนินการ" value={stats.open} sub="เคส" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="ปิดเคสแล้ว" value={stats.closed} sub="เคส" />
        <Kpi icon={<Gavel size={22} />} tint="bg-red-500/10 text-red-500" label="ความผิดร้ายแรง" value={stats.severe} sub="รายการ" />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนประเภทความผิด" subtitle="จำนวนรายการแยกตามระดับความรุนแรง" segments={byType} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน, ประเภทความผิด หรือรายละเอียด..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Open">ยังไม่จบเคส</option>
          <option value="Closed">ปิดเคสแล้ว</option>
          <option value="Appealed">อยู่ระหว่างอุทธรณ์</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูลวินัย...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-textMuted">ไม่พบข้อมูลการลงโทษทางวินัย</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">พนักงาน</th>
                  <th className="px-6 py-4 font-semibold">วันที่เกิดเหตุ</th>
                  <th className="px-6 py-4 font-semibold">ประเภทความผิด</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredRecords.map(record => {
                  const incident = INCIDENT_META[record.incidentType] ?? { label: record.incidentType, hex: "#6b7280", pill: "bg-gray-700/50 text-gray-400" };
                  const status = STATUS_META[record.status] ?? { label: record.status, pill: "bg-gray-700/50 text-gray-400" };
                  return (
                    <tr key={record.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${incident.hex}1a`, color: incident.hex }}>
                            <Scale size={16} />
                          </div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{record.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textMuted">{record.incidentDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${incident.pill}`}>
                          {incident.label || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${status.pill}`}>
                          {status.label || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(record)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(record.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-textMuted text-xs">—</span>
                        )}
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
              <h3 className="text-xl font-bold text-white">
                {editingRecord ? "แก้ไขบันทึกวินัย" : "เพิ่มบันทึกการกระทำผิด"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รหัสพนักงาน</label>
                    <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} placeholder="EMP001" />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อพนักงาน</label>
                    <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.employeeName} onChange={(e) => setFormData({...formData, employeeName: e.target.value})} placeholder="ชื่อ-นามสกุล" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่เกิดเหตุ</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.incidentDate} onChange={(e) => setFormData({...formData, incidentDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภทความผิด</label>
                    <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.incidentType} onChange={(e) => setFormData({...formData, incidentType: e.target.value})}>
                      <option value="Warning">Warning (ตักเตือนด้วยวาจา)</option>
                      <option value="Written Warning">Written Warning (ตักเตือนเป็นลายลักษณ์อักษร)</option>
                      <option value="Final Warning">Final Warning (ตักเตือนครั้งสุดท้าย)</option>
                      <option value="Termination">Termination (เลิกจ้าง)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียดการกระทำผิด</label>
                  <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="ระบุรายละเอียดเหตุการณ์..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">การดำเนินการ</label>
                    <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.actionTaken} onChange={(e) => setFormData({...formData, actionTaken: e.target.value})} placeholder="เช่น พักงาน 3 วัน" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                    <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Open">Open (ยังไม่จบเคส)</option>
                      <option value="Closed">Closed (ปิดเคสแล้ว)</option>
                      <option value="Appealed">Appealed (อยู่ระหว่างอุทธรณ์)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingRecord ? "บันทึกการแก้ไข" : "บันทึกวินัย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
