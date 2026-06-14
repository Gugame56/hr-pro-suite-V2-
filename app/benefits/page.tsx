"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Gift, Layers, Coins, LayoutGrid, List,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, formatBaht, type Segment } from "@/lib/dashboardKit";

type Benefit = {
  id?: string;
  name?: string;
  type?: string;
  value?: string;
  description?: string;
};

const PALETTE = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#d946ef", "#84cc16"];

export default function BenefitsPage() {
  // Admin/Manager only may add/edit/delete; employees see the catalogue read-only.
  const canManage = useCanManage();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [formData, setFormData] = useState<Benefit>({ name: "", type: "", value: "", description: "" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchBenefits(); }, []);

  const fetchBenefits = async () => {
    setIsLoading(true);
    try {
      // Benefits is a shared catalogue managed by HR — show all, not just one id.
      const res = await fetch(`/api/benefits`);
      const data = await res.json();
      if (Array.isArray(data)) setBenefits(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลสวัสดิการ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Deterministic colour per benefit type.
  const typeColor = useMemo(() => {
    const types = Array.from(new Set(benefits.map((b) => b.type).filter(Boolean))) as string[];
    const map: Record<string, string> = {};
    types.sort().forEach((t, i) => { map[t] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [benefits]);

  const allTypes = useMemo(
    () => Array.from(new Set(benefits.map((b) => b.type).filter(Boolean))).sort() as string[],
    [benefits]
  );

  const filteredBenefits = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return benefits.filter((b) => {
      const matchesSearch = (b.name || "").toLowerCase().includes(q) || (b.type || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || b.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [benefits, searchTerm, typeFilter]);

  const stats = useMemo(() => ({
    total: benefits.length,
    totalValue: benefits.reduce((s, b) => s + (parseFloat(String(b.value ?? "").replace(/[^0-9.]/g, "")) || 0), 0),
    types: allTypes.length,
  }), [benefits, allTypes]);

  const byType: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of benefits) {
      const key = b.type || "ไม่ระบุ";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value, hex: typeColor[label] ?? "#6b7280" }))
      .sort((a, b) => b.value - a.value);
  }, [benefits, typeColor]);

  const openAddModal = () => {
    setEditingBenefit(null);
    setFormData({ name: "", type: "", value: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setFormData({
      name: benefit.name || "", type: benefit.type || "", value: benefit.value || "", description: benefit.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingBenefit ? "PATCH" : "POST";
    const body = editingBenefit ? { id: editingBenefit.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/benefits", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingBenefit ? "อัปเดตสวัสดิการสำเร็จ" : "เพิ่มสวัสดิการสำเร็จ");
      await fetchBenefits();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    try {
      const res = await fetch(`/api/benefits?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบสวัสดิการสำเร็จ");
      await fetchBenefits();
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
          <h2 className="text-2xl font-bold text-white">สวัสดิการพนักงาน (Benefits)</h2>
          <p className="text-textMuted text-sm">จัดการและตรวจสอบสิทธิประโยชน์ของพนักงาน</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มสวัสดิการ
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi icon={<Gift size={22} />} tint="bg-blue-500/10 text-blue-500" label="สวัสดิการทั้งหมด" value={stats.total} sub="รายการ" />
        <Kpi icon={<Coins size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="มูลค่ารวมโดยประมาณ" value={formatBaht(stats.totalValue)} />
        <Kpi icon={<Layers size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="ประเภทสวัสดิการ" value={stats.types} sub="ประเภท" />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนสวัสดิการตามประเภท" subtitle="จำนวนรายการแยกตามประเภท" segments={byType} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาสวัสดิการ, ประเภท..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกประเภท</option>
          {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex bg-cardDark border border-gray-800 rounded-xl p-1">
          <button onClick={() => setView("card")} title="มุมมองการ์ด"
            className={`p-1.5 rounded-lg transition-colors ${view === "card" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setView("table")} title="มุมมองตาราง"
            className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}><List size={18} /></button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredBenefits.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลสวัสดิการ</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBenefits.map((b) => {
            const hex = typeColor[b.type || ""] ?? "#6b7280";
            return (
              <div key={b.id} className="bg-cardDark border border-gray-800 rounded-2xl p-5 group hover:border-brandPurple/50 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${hex}1a`, color: hex }}><Gift size={20} /></div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(b)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="text-white font-bold mt-3 leading-tight">{b.name}</h3>
                {b.type && (
                  <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} /> {b.type}
                  </span>
                )}
                <p className="text-lg font-bold text-white mt-3">{b.value || "-"}</p>
                {b.description && <p className="text-textMuted text-xs mt-2 line-clamp-2">{b.description}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ชื่อสวัสดิการ</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">มูลค่า/สิทธิ์</th>
                  <th className="px-6 py-4 font-semibold">รายละเอียด</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredBenefits.map((benefit) => {
                  const hex = typeColor[benefit.type || ""] ?? "#6b7280";
                  return (
                    <tr key={benefit.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-white group-hover:text-brandPurple">{benefit.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-textMuted">
                          {benefit.type && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />}
                          {benefit.type || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-bold">{benefit.value}</td>
                      <td className="px-6 py-4 text-textMuted italic truncate max-w-xs">{benefit.description || "-"}</td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(benefit)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(benefit.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingBenefit ? "แก้ไขสวัสดิการ" : "เพิ่มสวัสดิการใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อสวัสดิการ</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น ค่ารักษาพยาบาลรายปี" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภท</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="เช่น สุขภาพ" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">มูลค่า/สิทธิ์</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="เช่น 5,000 บาท" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียด</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="รายละเอียดเงื่อนไขการรับสวัสดิการ..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingBenefit ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
