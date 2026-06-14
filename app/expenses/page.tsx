"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  CreditCard, CheckCircle2, AlertCircle, Wallet,
} from "lucide-react";
import { Kpi, DonutPanel, StatusPill, formatBaht, type Segment } from "@/lib/dashboardKit";

type Expense = {
  id?: string;
  title?: string;
  amount?: string;
  category?: string;
  date?: string;
  reason?: string;
  status?: string;
};

// Category metadata — Thai label + donut colour.
const CATEGORY_META: Record<string, { label: string; hex: string }> = {
  Travel: { label: "เดินทาง", hex: "#3b82f6" },
  Food: { label: "อาหาร", hex: "#f59e0b" },
  Equipment: { label: "อุปกรณ์", hex: "#8b5cf6" },
  Other: { label: "อื่นๆ", hex: "#6b7280" },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Expense>({
    title: "", amount: "", category: "Travel", date: "", reason: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      // No per-user auth yet (employeeId is hard-coded) — show all expense claims.
      const res = await fetch(`/api/expenses`);
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลเบิกจ่าย", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const amt = (e: Expense) => parseFloat(e.amount || "") || 0;

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return expenses.filter((e) => {
      const matchesSearch = (e.title || "").toLowerCase().includes(q) || (e.category || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const stats = useMemo(() => ({
    total: expenses.reduce((s, e) => s + amt(e), 0),
    approvedAmount: expenses.filter((e) => e.status === "Approved").reduce((s, e) => s + amt(e), 0),
    approved: expenses.filter((e) => e.status === "Approved").length,
    pending: expenses.filter((e) => e.status === "Pending").length,
  }), [expenses]);

  const byCategory: Segment[] = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      const key = e.category || "Other";
      totals[key] = (totals[key] || 0) + amt(e);
    }
    return Object.entries(totals)
      .map(([key, value]) => ({ label: CATEGORY_META[key]?.label ?? key, value, hex: CATEGORY_META[key]?.hex ?? "#6b7280" }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({ title: "", amount: "", category: "Travel", date: new Date().toISOString().split("T")[0], reason: "", status: "Pending" });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title || "", amount: expense.amount || "", category: expense.category || "Travel",
      date: expense.date || "", reason: expense.reason || "", status: expense.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingExpense ? "PATCH" : "POST";
    const body = editingExpense ? { id: editingExpense.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/expenses", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingExpense ? "อัปเดตรายการเบิกจ่ายสำเร็จ" : "ส่งคำขอเบิกจ่ายสำเร็จ");
      await fetchExpenses();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบรายการเบิกจ่ายสำเร็จ");
      await fetchExpenses();
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
          <h2 className="text-2xl font-bold text-white">เบิกค่าใช้จ่าย (Expense Claims)</h2>
          <p className="text-textMuted text-sm">จัดการและติดตามการเบิกค่าใช้จ่ายในการทำงาน</p>
        </div>
        <button onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
          <Plus size={18} /> ยื่นเบิกค่าใช้จ่าย
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<CreditCard size={22} />} tint="bg-blue-500/10 text-blue-500" label="ยอดเบิกสะสม" value={formatBaht(stats.total)} />
        <Kpi icon={<Wallet size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="อนุมัติแล้ว (ยอด)" value={formatBaht(stats.approvedAmount)} />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="อนุมัติแล้ว" value={stats.approved} sub="รายการ" />
        <Kpi icon={<AlertCircle size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="รอตรวจสอบ" value={stats.pending} sub="รายการ" />
      </div>

      {/* Distribution */}
      <DonutPanel title="ยอดเบิกตามหมวดหมู่" subtitle="สัดส่วนค่าใช้จ่ายแยกตามประเภท" segments={byCategory} centerLabel="หมวด" valueFormat={formatBaht} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาหัวข้อเบิกจ่าย..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกหมวดหมู่</option>
          <option value="Travel">เดินทาง</option>
          <option value="Food">อาหาร</option>
          <option value="Equipment">อุปกรณ์</option>
          <option value="Other">อื่นๆ</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredExpenses.length} / {expenses.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ไม่พบข้อมูลรายการเบิกจ่าย</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">รายการ</th>
                  <th className="px-6 py-4 font-semibold">หมวดหมู่</th>
                  <th className="px-6 py-4 font-semibold">จำนวนเงิน</th>
                  <th className="px-6 py-4 font-semibold">วันที่</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredExpenses.map((expense) => {
                  const cat = CATEGORY_META[expense.category || ""] ?? null;
                  return (
                    <tr key={expense.id} className="hover:bg-gray-800/20 transition-colors group">
                      <td className="px-6 py-4 font-medium text-white group-hover:text-brandPurple">{expense.title}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-textMuted">
                          {cat && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.hex }} />}
                          {cat?.label ?? expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-bold">{formatBaht(expense.amount)}</td>
                      <td className="px-6 py-4 text-textMuted">{expense.date}</td>
                      <td className="px-6 py-4"><StatusPill status={expense.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(expense)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingExpense ? "แก้ไขรายการเบิกจ่าย" : "ยื่นคำขอเบิกค่าใช้จ่าย"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หัวข้อการเบิก</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น ค่าที่พักเดินทางไปดูงาน" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หมวดหมู่</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Travel">เดินทาง</option>
                    <option value="Food">อาหาร</option>
                    <option value="Equipment">อุปกรณ์</option>
                    <option value="Other">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จำนวนเงิน (฿)</label>
                  <input required type="number" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่จ่ายจริง</label>
                <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เหตุผล/รายละเอียด</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="ระบุรายละเอียดเพิ่มเติม..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingExpense ? "บันทึกการแก้ไข" : "ส่งคำขอเบิก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
