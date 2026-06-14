"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2,
  X, TrendingUp, Target, Award, ClipboardCheck,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, type Segment } from "@/lib/dashboardKit";

// Status palette shared by donut + pills.
const STATUS_META: Record<string, { label: string; hex: string; pill: string }> = {
  Completed: { label: "เสร็จสิ้น", hex: "#10b981", pill: "bg-brandGreen/10 text-brandGreen" },
  "Under Review": { label: "รอตรวจสอบ", hex: "#f59e0b", pill: "bg-brandOrange/10 text-brandOrange" },
  Draft: { label: "ฉบับร่าง", hex: "#6b7280", pill: "bg-gray-700/50 text-gray-400" },
};

// Map a 0-5 score to a letter grade for the headline KPI.
function scoreToGrade(score: number): string {
  if (score >= 4.7) return "A+";
  if (score >= 4.3) return "A";
  if (score >= 4.0) return "A-";
  if (score >= 3.7) return "B+";
  if (score >= 3.3) return "B";
  if (score >= 3.0) return "B-";
  if (score >= 2.5) return "C";
  if (score > 0) return "D";
  return "-";
}

function scoreHex(score: number): string {
  if (score >= 4) return "#10b981";
  if (score >= 3) return "#f59e0b";
  if (score > 0) return "#ef4444";
  return "#6b7280";
}

export default function EvaluationsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<any>(null);
  const [formData, setFormData] = useState({
    period: "",
    score: 0,
    feedback: "",
    manager: "",
    status: "Draft"
  });
  const [notification, setNotification] = useState<any>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      // Managed by HR/managers — show all evaluations, not just one employee's.
      const res = await fetch(`/api/evaluations`);
      const data = await res.json();
      if (Array.isArray(data)) setEvaluations(data);
    } catch (err) {
      showNotification("Error fetching evaluations", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredEvals = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return evaluations.filter(e => {
      const matchesSearch =
        (e.period || "").toLowerCase().includes(q) || (e.manager || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [evaluations, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const avg = evaluations.length
      ? evaluations.reduce((sum, e) => sum + (parseFloat(e.score) || 0), 0) / evaluations.length
      : 0;
    return {
      avg,
      completed: evaluations.filter(e => e.status === "Completed").length,
      total: evaluations.length,
      grade: scoreToGrade(avg),
    };
  }, [evaluations]);

  const byStatus: Segment[] = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of evaluations) {
      const key = e.status || "Draft";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({
        label: STATUS_META[label]?.label ?? label,
        value,
        hex: STATUS_META[label]?.hex ?? "#6b7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [evaluations]);

  const openAddModal = () => {
    setEditingEval(null);
    setFormData({ period: "", score: 0, feedback: "", manager: "", status: "Draft" });
    setIsModalOpen(true);
  };

  const openEditModal = (evaluation: any) => {
    setEditingEval(evaluation);
    setFormData({
      period: evaluation.period || "",
      score: evaluation.score || 0,
      feedback: evaluation.feedback || "",
      manager: evaluation.manager || "",
      status: evaluation.status || "Draft"
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editingEval ? 'PATCH' : 'POST';
    const body = editingEval ? { id: editingEval.id, ...formData } : { ...formData, employeeId: currentEmployeeId };

    try {
      const res = await fetch('/api/evaluations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      showNotification(editingEval ? "อัปเดตผลประเมินสำเร็จ" : "บันทึกผลประเมินสำเร็จ");
      await fetchEvaluations();
      setIsModalOpen(false);
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการประเมินนี้?")) return;

    try {
      const res = await fetch(`/api/evaluations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showNotification("ลบรายการประเมินสำเร็จ");
      await fetchEvaluations();
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
          <h2 className="text-2xl font-bold text-white">ประเมินผล (Evaluations)</h2>
          <p className="text-textMuted text-sm">ติดตามผลการดำเนินงานและตั้งเป้าหมายการเติบโต</p>
        </div>
        {canManage && (
          <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
        >
          <Plus size={18} />
          สร้างผลประเมิน
        </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Target size={22} />} tint="bg-blue-500/10 text-blue-500" label="คะแนนเฉลี่ย" value={`${stats.avg.toFixed(1)}`} sub="จากเต็ม 5.0" />
        <Kpi icon={<Award size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="เกรดเฉลี่ย" value={stats.grade} />
        <Kpi icon={<TrendingUp size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="ประเมินเสร็จสิ้น" value={stats.completed} sub="รายการ" />
        <Kpi icon={<ClipboardCheck size={22} />} tint="bg-amber-500/10 text-amber-500" label="ทั้งหมด" value={stats.total} sub="รายการ" />
      </div>

      {/* Distribution */}
      <DonutPanel title="สัดส่วนสถานะการประเมิน" subtitle="จำนวนรายการแยกตามสถานะ" segments={byStatus} centerLabel="รายการ" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาช่วงเวลา หรือผู้ประเมิน..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Draft">ฉบับร่าง</option>
          <option value="Under Review">รอตรวจสอบ</option>
          <option value="Completed">เสร็จสิ้น</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredEvals.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-textMuted">ไม่พบข้อมูลการประเมิน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">รอบการประเมิน</th>
                  <th className="px-6 py-4 font-semibold">คะแนน</th>
                  <th className="px-6 py-4 font-semibold">ผู้ประเมิน</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredEvals.map(evalItem => {
                  const score = parseFloat(evalItem.score) || 0;
                  const meta = STATUS_META[evalItem.status] ?? { label: evalItem.status, pill: "bg-gray-700/50 text-gray-400" };
                  return (
                    <tr key={evalItem.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4 text-white font-medium group-hover:text-brandPurple">{evalItem.period}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <span className="text-white font-bold w-12 shrink-0">{score.toFixed(1)}<span className="text-textMuted text-xs font-normal"> / 5</span></span>
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(score / 5) * 100}%`, backgroundColor: scoreHex(score) }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-textMuted">{evalItem.manager || "-"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.pill}`}>
                          {(meta.label || "UNKNOWN")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(evalItem)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(evalItem.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
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
                {editingEval ? "แก้ไขผลประเมิน" : "สร้างผลประเมินใหม่"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รอบการประเมิน</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} placeholder="เช่น Q1 2024 หรือ ประจำปี 2023" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">คะแนน (0-5)</label>
                    <input required type="number" step="0.1" min="0" max="5" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.score} onChange={(e) => setFormData({...formData, score: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                    <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Draft">Draft (ฉบับร่าง)</option>
                      <option value="Under Review">Under Review (รอตรวจสอบ)</option>
                      <option value="Completed">Completed (เสร็จสิ้น)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ผู้ประเมิน</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.manager} onChange={(e) => setFormData({...formData, manager: e.target.value})} placeholder="ชื่อ-นามสกุล ผู้ประเมิน" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ข้อเสนอแนะ/ความคิดเห็น</label>
                  <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.feedback} onChange={(e) => setFormData({...formData, feedback: e.target.value})} placeholder="ระบุจุดเด่นและสิ่งที่ควรพัฒนา..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingEval ? "บันทึกการแก้ไข" : "บันทึกผลประเมิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
