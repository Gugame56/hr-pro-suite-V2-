"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2,
  X, FileText, Download, FileCheck, Clock, FileClock,
} from "lucide-react";
import { Kpi, DonutPanel, type Segment } from "@/lib/dashboardKit";

// Status palette shared by donut + pills.
const STATUS_META: Record<string, { label: string; hex: string; pill: string }> = {
  Ready: { label: "พร้อมรับ", hex: "#10b981", pill: "bg-brandGreen/10 text-brandGreen" },
  Processing: { label: "กำลังดำเนินการ", hex: "#3b82f6", pill: "bg-blue-500/10 text-blue-500" },
  Pending: { label: "รอคิว", hex: "#f59e0b", pill: "bg-brandOrange/10 text-brandOrange" },
  Rejected: { label: "ปฏิเสธ", hex: "#ef4444", pill: "bg-brandRed/10 text-brandRed" },
};

// Thai labels for the certificate types.
const TYPE_LABEL: Record<string, string> = {
  "Employment Certificate": "หนังสือรับรองการทำงาน",
  "Salary Certificate": "หนังสือรับรองเงินเดือน",
  "Tax Certificate": "หนังสือรับรองภาษี",
  Other: "อื่นๆ",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    type: "Employment Certificate",
    purpose: "",
    amount: 1,
    dateRequested: new Date().toISOString().split('T')[0],
    status: "Pending"
  });
  const [notification, setNotification] = useState<any>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // No per-user auth yet (employeeId is hard-coded), so show every request
      // instead of silently filtering to one id — consistent with the other modules.
      const res = await fetch(`/api/documents`);
      const data = await res.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      showNotification("Error fetching documents", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredDocsMemo = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return documents.filter(d => {
      const matchesSearch =
        (d.type || "").toLowerCase().includes(q) || (d.purpose || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [documents, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: documents.length,
    ready: documents.filter(d => d.status === "Ready").length,
    processing: documents.filter(d => d.status === "Processing").length,
    pending: documents.filter(d => d.status === "Pending").length,
  }), [documents]);

  const byStatus: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of documents) {
      const key = d.status || "Pending";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({
        label: STATUS_META[key]?.label ?? key,
        value,
        hex: STATUS_META[key]?.hex ?? "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [documents]);

  const openAddModal = () => {
    setEditingDoc(null);
    setFormData({
      type: "Employment Certificate",
      purpose: "",
      amount: 1,
      dateRequested: new Date().toISOString().split('T')[0],
      status: "Pending"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc: any) => {
    setEditingDoc(doc);
    setFormData({
      type: doc.type || "Employment Certificate",
      purpose: doc.purpose || "",
      amount: doc.amount || 1,
      dateRequested: doc.dateRequested || "",
      status: doc.status || "Pending"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editingDoc ? 'PATCH' : 'POST';
    const body = editingDoc ? { id: editingDoc.id, ...formData } : { ...formData, employeeId: currentEmployeeId };

    try {
      const res = await fetch('/api/documents', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      showNotification(editingDoc ? "อัปเดตคำขอเอกสารสำเร็จ" : "ส่งคำขอเอกสารสำเร็จ");
      await fetchDocuments();
      setIsModalOpen(false);
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;

    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showNotification("ลบรายการเอกสารสำเร็จ");
      await fetchDocuments();
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
          <h2 className="text-2xl font-bold text-white">เอกสารรับรอง (Documents)</h2>
          <p className="text-textMuted text-sm">ขอเอกสารรับรองเงินเดือน หรือหนังสือรับรองการทำงาน</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
        >
          <Plus size={18} />
          ขอเอกสารใหม่
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<FileText size={22} />} tint="bg-blue-500/10 text-blue-500" label="คำขอทั้งหมด" value={stats.total} sub="รายการ" />
        <Kpi icon={<FileCheck size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="พร้อมดาวน์โหลด" value={stats.ready} sub="รายการ" />
        <Kpi icon={<FileClock size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="กำลังดำเนินการ" value={stats.processing} sub="รายการ" />
        <Kpi icon={<Clock size={22} />} tint="bg-amber-500/10 text-amber-500" label="รอคิว" value={stats.pending} sub="รายการ" />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนสถานะคำขอเอกสาร" subtitle="จำนวนคำขอแยกตามสถานะ" segments={byStatus} centerLabel="คำขอ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาประเภทเอกสาร หรือวัตถุประสงค์..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">รอคิว</option>
          <option value="Processing">กำลังดำเนินการ</option>
          <option value="Ready">พร้อมรับ</option>
          <option value="Rejected">ปฏิเสธ</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredDocsMemo.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-textMuted">ไม่พบข้อมูลคำขอเอกสาร</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">ประเภทเอกสาร</th>
                  <th className="px-6 py-4 font-semibold">วัตถุประสงค์</th>
                  <th className="px-6 py-4 font-semibold">วันที่ขอ</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredDocsMemo.map(doc => {
                  const meta = STATUS_META[doc.status] ?? { label: doc.status, pill: "bg-gray-700/50 text-gray-400" };
                  return (
                    <tr key={doc.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-800 rounded-lg text-brandPurple">
                            <FileText size={16} />
                          </div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{TYPE_LABEL[doc.type] ?? doc.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textMuted italic truncate max-w-xs">{doc.purpose || "-"}</td>
                      <td className="px-6 py-4 text-textMuted">{doc.dateRequested}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.pill}`}>
                          {meta.label || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {doc.status === 'Ready' && (
                            <button className="p-2 hover:bg-brandPurple/20 rounded-lg text-brandPurple transition-colors" title="Download">
                              <Download size={16} />
                            </button>
                          )}
                          <button onClick={() => openEditModal(doc)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
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
              <h3 className="text-xl font-bold text-white">
                {editingDoc ? "แก้ไขคำขอเอกสาร" : "ขอเอกสารรับรอง"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภทเอกสาร</label>
                  <select required className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="Employment Certificate">หนังสือรับรองการทำงาน (Employment Certificate)</option>
                    <option value="Salary Certificate">หนังสือรับรองเงินเดือน (Salary Certificate)</option>
                    <option value="Tax Certificate">หนังสือรับรองภาษี (Tax Certificate)</option>
                    <option value="Other">อื่นๆ</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จำนวนฉบับ</label>
                    <input required type="number" min="1" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่ขอ</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.dateRequested} onChange={(e) => setFormData({...formData, dateRequested: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วัตถุประสงค์ในการขอ</label>
                  <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} placeholder="เช่น ยื่นขอวีซ่า, เปิดบัญชีธนาคาร..." />
                </div>
                {editingDoc && (
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะการดำเนินการ</label>
                    <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Pending">Pending (รอคิว)</option>
                      <option value="Processing">Processing (กำลังดำเนินการ)</option>
                      <option value="Ready">Ready (พร้อมรับ/ดาวน์โหลด)</option>
                      <option value="Rejected">Rejected (ปฏิเสธ)</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingDoc ? "บันทึกการแก้ไข" : "ส่งคำขอเอกสาร"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
