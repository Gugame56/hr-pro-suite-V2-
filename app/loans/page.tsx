"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Banknote, CheckCircle2, AlertCircle, Wallet,
} from "lucide-react";
import { Kpi, DonutPanel, StatusPill, STATUS_HEX, formatBaht, type Segment } from "@/lib/dashboardKit";

type Loan = {
  id?: string;
  amount?: string;
  reason?: string;
  term?: string;
  interest?: string;
  status?: string;
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState<Loan>({
    amount: "", reason: "", term: "", interest: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      // No per-user auth yet (employeeId is hard-coded), so show every request
      // instead of silently filtering to one id — consistent with the other modules.
      const res = await fetch(`/api/loans`);
      const data = await res.json();
      if (Array.isArray(data)) setLoans(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลเงินกู้", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const amt = (l: Loan) => parseFloat(l.amount || "") || 0;

  const filteredLoans = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return loans.filter((loan) => {
      const matchesSearch = (loan.reason || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: loans.reduce((s, l) => s + amt(l), 0),
    approvedAmount: loans.filter((l) => l.status === "Approved").reduce((s, l) => s + amt(l), 0),
    approved: loans.filter((l) => l.status === "Approved").length,
    pending: loans.filter((l) => l.status === "Pending").length,
    rejected: loans.filter((l) => l.status === "Rejected").length,
  }), [loans]);

  const amountByStatus: Segment[] = useMemo(() => [
    { label: "อนุมัติแล้ว", value: stats.approvedAmount, hex: STATUS_HEX.Approved },
    { label: "รอพิจารณา", value: loans.filter((l) => l.status === "Pending").reduce((s, l) => s + amt(l), 0), hex: STATUS_HEX.Pending },
    { label: "ปฏิเสธ", value: loans.filter((l) => l.status === "Rejected").reduce((s, l) => s + amt(l), 0), hex: STATUS_HEX.Rejected },
  ].filter((s) => s.value > 0), [loans, stats]);

  const openAddModal = () => {
    setEditingLoan(null);
    setFormData({ amount: "", reason: "", term: "", interest: "", status: "Pending" });
    setIsModalOpen(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      amount: loan.amount || "", reason: loan.reason || "", term: loan.term || "",
      interest: loan.interest || "", status: loan.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingLoan ? "PATCH" : "POST";
    const body = editingLoan ? { id: editingLoan.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/loans", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingLoan ? "อัปเดตข้อมูลเงินกู้สำเร็จ" : "ส่งคำขอกู้เงินสำเร็จ");
      await fetchLoans();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    try {
      const res = await fetch(`/api/loans?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบรายการเงินกู้สำเร็จ");
      await fetchLoans();
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
          <h2 className="text-2xl font-bold text-white">เงินกู้และเบิกล่วงหน้า (Loans &amp; Advances)</h2>
          <p className="text-textMuted text-sm">จัดการคำขอกู้เงินสวัสดิการและเงินเบิกล่วงหน้า</p>
        </div>
        <button onClick={openAddModal}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
          <Plus size={18} /> ยื่นคำขอเงินกู้
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Banknote size={22} />} tint="bg-blue-500/10 text-blue-500" label="ยอดคำขอรวม" value={formatBaht(stats.total)} />
        <Kpi icon={<Wallet size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="อนุมัติแล้ว (ยอด)" value={formatBaht(stats.approvedAmount)} />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="รายการอนุมัติ" value={stats.approved} sub="รายการ" />
        <Kpi icon={<AlertCircle size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="รอพิจารณา" value={stats.pending} sub="รายการ" />
      </div>

      {/* Distribution */}
      <DonutPanel title="ยอดเงินกู้ตามสถานะ" subtitle="มูลค่ารวมของคำขอแบ่งตามสถานะ" segments={amountByStatus} centerLabel="ทั้งหมด" valueFormat={formatBaht} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาเหตุผลการกู้..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">รอพิจารณา</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Rejected">ปฏิเสธ</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredLoans.length} / {loans.length} รายการ</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ไม่พบข้อมูลเงินกู้</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">จำนวนเงิน</th>
                  <th className="px-6 py-4 font-semibold">ระยะเวลา/ดอกเบี้ย</th>
                  <th className="px-6 py-4 font-semibold">เหตุผล</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4 text-white font-bold">{formatBaht(loan.amount)}</td>
                    <td className="px-6 py-4 text-textMuted">{loan.term} <span className="text-gray-500">({loan.interest || 0}%)</span></td>
                    <td className="px-6 py-4 text-textMuted italic truncate max-w-xs">{loan.reason || "-"}</td>
                    <td className="px-6 py-4"><StatusPill status={loan.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(loan)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(loan.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingLoan ? "แก้ไขคำขอกู้เงิน" : "ยื่นคำขอกู้เงิน / เบิกเงินล่วงหน้า"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จำนวนเงิน (฿)</label>
                  <input required type="number" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="เช่น 5000" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ดอกเบี้ย (%)</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.interest} onChange={(e) => setFormData({ ...formData, interest: e.target.value })} placeholder="เช่น 0" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ระยะเวลาชำระคืน</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} placeholder="เช่น 6 เดือน" />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เหตุผลความจำเป็น</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="ระบุเหตุผลในการขอกู้เงิน..." />
              </div>
              {editingLoan && (
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending (รออนุมัติ)</option>
                    <option value="Approved">Approved (อนุมัติแล้ว)</option>
                    <option value="Rejected">Rejected (ปฏิเสธ)</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingLoan ? "บันทึกการแก้ไข" : "ส่งคำขอ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
