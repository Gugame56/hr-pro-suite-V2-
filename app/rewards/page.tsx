"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2,
  X, Award, Trophy, Star, Heart, Coins, Medal,
  LayoutGrid, List,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, formatBaht, type Segment } from "@/lib/dashboardKit";

// Per-type visual identity (icon + colour) used across cards, pills and donut.
const TYPE_META: Record<string, { label: string; hex: string; icon: typeof Award }> = {
  Performance: { label: "ผลงานดีเด่น", hex: "#8b5cf6", icon: Trophy },
  Recognition: { label: "คำชมเชย", hex: "#ef4444", icon: Heart },
  Service: { label: "อายุงาน", hex: "#3b82f6", icon: Medal },
  Other: { label: "อื่นๆ", hex: "#f59e0b", icon: Star },
};

function typeMeta(type?: string) {
  return TYPE_META[type || ""] ?? { label: type || "ไม่ระบุ", hex: "#6b7280", icon: Award };
}

export default function RewardsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [rewards, setRewards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "Performance",
    date: "",
    description: "",
    value: ""
  });
  const [notification, setNotification] = useState<any>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setIsLoading(true);
    try {
      // Managed by HR — show all rewards records, not just one employee's.
      const res = await fetch(`/api/rewards`);
      const data = await res.json();
      if (Array.isArray(data)) setRewards(data);
    } catch (err) {
      showNotification("Error fetching rewards", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredRewards = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return rewards.filter(r => {
      const matchesSearch = (r.title || "").toLowerCase().includes(q) || (r.type || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [rewards, searchTerm, typeFilter]);

  const stats = useMemo(() => ({
    total: rewards.length,
    recognition: rewards.filter(r => r.type === "Recognition").length,
    performance: rewards.filter(r => r.type === "Performance").length,
    totalValue: rewards.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0),
  }), [rewards]);

  const byType: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rewards) {
      const key = r.type || "Other";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([key, value]) => ({ label: typeMeta(key).label, value, hex: typeMeta(key).hex }))
      .sort((a, b) => b.value - a.value);
  }, [rewards]);

  const openAddModal = () => {
    setEditingReward(null);
    setFormData({ title: "", type: "Performance", date: new Date().toISOString().split('T')[0], description: "", value: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (reward: any) => {
    setEditingReward(reward);
    setFormData({
      title: reward.title || "",
      type: reward.type || "Performance",
      date: reward.date || "",
      description: reward.description || "",
      value: reward.value || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editingReward ? 'PATCH' : 'POST';
    const body = editingReward ? { id: editingReward.id, ...formData } : { ...formData, employeeId: currentEmployeeId };

    try {
      const res = await fetch('/api/rewards', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      showNotification(editingReward ? "อัปเดตรางวัลสำเร็จ" : "เพิ่มรางวัลสำเร็จ");
      await fetchRewards();
      setIsModalOpen(false);
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการรางวัลนี้?")) return;

    try {
      const res = await fetch(`/api/rewards?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showNotification("ลบรางวัลสำเร็จ");
      await fetchRewards();
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
          <h2 className="text-2xl font-bold text-white">รางวัลและคำชมเชย (Rewards & Recognition)</h2>
          <p className="text-textMuted text-sm">บันทึกความสำเร็จและรางวัลที่พนักงานได้รับ</p>
        </div>
        {canManage && (
          <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
        >
          <Plus size={18} />
          เพิ่มรางวัล
        </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Trophy size={22} />} tint="bg-amber-500/10 text-amber-500" label="รางวัลทั้งหมด" value={stats.total} sub="รายการ" />
        <Kpi icon={<Award size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="ผลงานดีเด่น" value={stats.performance} sub="รายการ" />
        <Kpi icon={<Heart size={22} />} tint="bg-red-500/10 text-red-500" label="คำชมเชย" value={stats.recognition} sub="รายการ" />
        <Kpi icon={<Coins size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="มูลค่ารวม" value={formatBaht(stats.totalValue)} />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนรางวัลตามประเภท" subtitle="จำนวนรายการแยกตามประเภทรางวัล" segments={byType} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อรางวัล, ประเภท..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกประเภท</option>
          <option value="Performance">ผลงานดีเด่น</option>
          <option value="Recognition">คำชมเชย</option>
          <option value="Service">อายุงาน</option>
          <option value="Other">อื่นๆ</option>
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
      ) : filteredRewards.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลรางวัล</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRewards.map((r) => {
            const meta = typeMeta(r.type);
            const Icon = meta.icon;
            return (
              <div key={r.id} className="bg-cardDark border border-gray-800 rounded-2xl p-5 group hover:border-brandPurple/50 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${meta.hex}1a`, color: meta.hex }}><Icon size={20} /></div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(r)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="text-white font-bold mt-3 leading-tight line-clamp-2">{r.title}</h3>
                <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${meta.hex}1a`, color: meta.hex }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.hex }} /> {meta.label}
                </span>
                {r.description && <p className="text-textMuted text-xs mt-2 line-clamp-2">{r.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                  <span className="text-textMuted text-[11px]">{r.date || "-"}</span>
                  <span className="text-white font-bold text-sm">{parseFloat(r.value) ? formatBaht(r.value) : "-"}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">ชื่อรางวัล / ความสำเร็จ</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">วันที่ได้รับ</th>
                  <th className="px-6 py-4 font-semibold">มูลค่า</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredRewards.map(reward => {
                  const meta = typeMeta(reward.type);
                  const Icon = meta.icon;
                  return (
                    <tr key={reward.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${meta.hex}1a`, color: meta.hex }}>
                            <Icon size={16} />
                          </div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{reward.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-textMuted">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.hex }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-textMuted">{reward.date || "-"}</td>
                      <td className="px-6 py-4 text-white font-bold">{parseFloat(reward.value) ? formatBaht(reward.value) : "-"}</td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(reward)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(reward.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
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
              <h3 className="text-xl font-bold text-white">
                {editingReward ? "แก้ไขรางวัล" : "เพิ่มรางวัล/คำชมเชย"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อรางวัล / ความสำเร็จ</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="เช่น พนักงานดีเด่นประจำเดือน" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภท</label>
                    <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                      <option value="Performance">ผลงานดีเด่น</option>
                      <option value="Recognition">คำชมเชย</option>
                      <option value="Service">อายุงาน</option>
                      <option value="Other">อื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่ได้รับ</label>
                    <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">มูลค่ารางวัล (ถ้ามี)</label>
                  <input type="number" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียด</label>
                  <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="ระบุเหตุผลที่ได้รับรางวัล..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingReward ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
