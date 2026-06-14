"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  ShieldCheck, Coins, FileClock, ListChecks,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, StatusPill, STATUS_HEX, formatBaht, type Segment } from "@/lib/dashboardKit";

type SSRecord = {
  id?: string;
  ssn?: string;
  contributions?: string;
  lastUpdated?: string;
  status?: string;
};

export default function SocialSecurityPage() {
  // Admin/Manager only may add/edit/delete; employees view their record read-only.
  const canManage = useCanManage();
  const [records, setRecords] = useState<SSRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SSRecord | null>(null);
  const [formData, setFormData] = useState<SSRecord>({ ssn: "", contributions: "", lastUpdated: "", status: "Active" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/social-security?employeeId=${currentEmployeeId}`);
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลประกันสังคม", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredRecords = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return records.filter((r) => {
      const matchesSearch = r.ssn?.toLowerCase().includes(q) || r.status?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const latest = useMemo(() => {
    return [...records].sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""))[0];
  }, [records]);

  const stats = useMemo(() => ({
    status: latest?.status || "N/A",
    total: records.reduce((s, r) => s + (parseFloat(r.contributions || "") || 0), 0),
    count: records.length,
    lastUpdated: latest?.lastUpdated || "-",
  }), [records, latest]);

  const byStatus: Segment[] = useMemo(() => {
    const active = records.filter((r) => r.status === "Active").length;
    const inactive = records.filter((r) => r.status !== "Active").length;
    return [
      { label: "ปกติ (Active)", value: active, hex: STATUS_HEX.Active },
      { label: "ระงับ (Inactive)", value: inactive, hex: STATUS_HEX.Inactive },
    ].filter((s) => s.value > 0);
  }, [records]);

  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({ ssn: "", contributions: "", lastUpdated: new Date().toISOString().split("T")[0], status: "Active" });
    setIsModalOpen(true);
  };

  const openEditModal = (record: SSRecord) => {
    setEditingRecord(record);
    setFormData({
      ssn: record.ssn || "", contributions: record.contributions || "",
      lastUpdated: record.lastUpdated || "", status: record.status || "Active",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingRecord ? "PATCH" : "POST";
    const body = editingRecord ? { id: editingRecord.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/social-security", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingRecord ? "อัปเดตข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ");
      await fetchRecords();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    try {
      const res = await fetch(`/api/social-security?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบข้อมูลสำเร็จ");
      await fetchRecords();
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
          <h2 className="text-2xl font-bold text-white">ประกันสังคม (Social Security)</h2>
          <p className="text-textMuted text-sm">จัดการและตรวจสอบข้อมูลการส่งสมทบประกันสังคม</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มข้อมูล
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<ShieldCheck size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="สถานะสิทธิ์ล่าสุด" value={stats.status} />
        <Kpi icon={<Coins size={22} />} tint="bg-blue-500/10 text-blue-500" label="เงินสมทบสะสม" value={formatBaht(stats.total)} />
        <Kpi icon={<ListChecks size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="จำนวนรายการ" value={stats.count} sub="รายการ" />
        <Kpi icon={<FileClock size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="อัปเดตล่าสุด" value={<span className="text-base">{stats.lastUpdated}</span>} />
      </div>

      {/* Distribution */}
      <DonutPanel title="สถานะการส่งสมทบ" subtitle="จำนวนรายการแยกตามสถานะสิทธิ์" segments={byStatus} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาเลขประกันสังคม หรือสถานะ..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Active">ปกติ (Active)</option>
          <option value="Inactive">ระงับ (Inactive)</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredRecords.length} / {records.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ไม่พบข้อมูลประกันสังคม</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">เลขประกันสังคม</th>
                  <th className="px-6 py-4 font-semibold">เงินสมทบ</th>
                  <th className="px-6 py-4 font-semibold">อัปเดตล่าสุด</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white group-hover:text-brandPurple font-mono">{record.ssn}</td>
                    <td className="px-6 py-4 text-white font-bold">{formatBaht(record.contributions)}</td>
                    <td className="px-6 py-4 text-textMuted">{record.lastUpdated}</td>
                    <td className="px-6 py-4"><StatusPill status={record.status} /></td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(record)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(record.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    )}
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
              <h3 className="text-xl font-bold text-white">{editingRecord ? "แก้ไขข้อมูลประกันสังคม" : "เพิ่มข้อมูลประกันสังคม"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เลขประกันสังคม</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.ssn} onChange={(e) => setFormData({ ...formData, ssn: e.target.value })} placeholder="1-XXXX-XXXXX-XX-X" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เงินสมทบ (฿)</label>
                  <input required type="number" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.contributions} onChange={(e) => setFormData({ ...formData, contributions: e.target.value })} placeholder="เช่น 500" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่อัปเดต</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.lastUpdated} onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Active">Active (ปกติ)</option>
                  <option value="Inactive">Inactive (ระงับ)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingRecord ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
