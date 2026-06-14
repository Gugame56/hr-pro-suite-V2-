"use client";

import { useState, useEffect, useMemo } from "react";
import { DollarSign, Download, Eye, FileText, TrendingUp, Wallet, Loader2, RefreshCw } from "lucide-react";
import { canManage } from "@/lib/permissions";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Read the logged-in user's id from the session saved at login so the page
  // shows that employee's payroll (synced from their salary) instead of a
  // hardcoded demo id. Admins additionally get an employee picker so they can
  // review anyone's payslips.
  useEffect(() => {
    let employeeId = "";
    let admin = false;
    try {
      const session = localStorage.getItem("hr_session");
      if (session) {
        const user = JSON.parse(session);
        employeeId = (user.employeeId || user.id || "").toString();
        admin = canManage(user.role);
      }
    } catch {
      // ignore malformed session
    }
    setIsAdmin(admin);
    setSelectedId(employeeId);
    if (admin) loadEmployees();
    fetchPayroll(employeeId);
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch {
      // non-fatal — picker just stays empty
    }
  };

  const fetchPayroll = async (employeeId: string) => {
    if (!employeeId) {
      setPayrolls([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payroll?employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (Array.isArray(data)) setPayrolls(data);
    } catch (err) {
      showNotification("Error fetching payroll data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    fetchPayroll(id);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/payroll/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "ซิงค์เงินเดือนสำเร็จ");
        fetchPayroll(selectedId);
      } else {
        showNotification(data.error || "ซิงค์ไม่สำเร็จ", "error");
      }
    } catch {
      showNotification("ซิงค์ไม่สำเร็จ", "error");
    } finally {
      setSyncing(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const latestPayroll = useMemo(() => {
    if (payrolls.length === 0) return null;
    // Assuming the last one added is the latest
    return payrolls[payrolls.length - 1];
  }, [payrolls]);

  const ytdTotal = useMemo(() => {
    return payrolls.reduce((sum, p) => sum + (parseFloat(p.netPay) || 0), 0);
  }, [payrolls]);

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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">เงินเดือน (Payroll)</h2>
          <p className="text-textMuted text-sm">ตรวจสอบรายได้และดาวน์โหลดสลิปเงินเดือน</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <>
              <select
                value={selectedId}
                onChange={(e) => handleSelect(e.target.value)}
                className="bg-cardDark border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-brandPurple"
              >
                <option value="">— เลือกพนักงาน —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email || emp.id}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="bg-brandGreen hover:bg-green-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                title="ดึงเงินเดือนพนักงานทุกคนเข้าตาราง Payroll ของเดือนปัจจุบัน"
              >
                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                {syncing ? "กำลังซิงค์..." : "ซิงค์เงินเดือนทั้งหมด"}
              </button>
            </>
          )}
          <button className="bg-brandPurple hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
            <Download size={18} />
            ดาวน์โหลดทั้งหมด (ZIP)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salary Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-brandPurple to-purple-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-purple-100 text-sm font-medium opacity-80">รายได้สุทธิเดือนล่าสุด</p>
                <h3 className="text-4xl font-black mt-1 tracking-tight">
                  ฿{latestPayroll?.netPay ? parseFloat(latestPayroll.netPay).toLocaleString() : "0.00"}
                </h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Wallet size={24} />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">เงินเดือนพื้นฐาน</span>
                <span className="font-bold">฿{latestPayroll?.baseSalary || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm text-red-200">
                <span className="opacity-80">หักภาษี/ประกันสังคม</span>
                <span className="font-bold">- ฿{latestPayroll?.deductions || "0.00"}</span>
              </div>
            </div>
          </div>

          <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-brandGreen" size={18} />
              สถิติรายได้ปีนี้
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-textMuted text-xs">รายได้รวมสะสม (YTD)</p>
                <p className="text-white font-bold">฿{ytdTotal.toLocaleString()}</p>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-brandGreen h-full w-[45%]"></div>
              </div>
              <p className="text-[10px] text-textMuted text-right italic">คำนวณจากประวัติการจ่ายเงิน</p>
            </div>
          </div>
        </div>

        {/* Payslip History */}
        <div className="lg:col-span-2">
          <div className="bg-cardDark border border-gray-800 rounded-3xl overflow-hidden shadow-xl h-full flex flex-col">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-brandPurple" size={20} />
                ประวัติสลิปเงินเดือน
              </h3>
            </div>
            <div className="flex-1">
              {isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
                  <p className="text-textMuted">กำลังโหลดข้อมูล...</p>
                </div>
              ) : payrolls.length === 0 ? (
                <div className="p-20 text-center">
                  <p className="text-textMuted">ไม่พบข้อมูลการจ่ายเงินเดือน</p>
                </div>
              ) : (
                payrolls.map((slip, i) => (
                  <div key={i} className="flex items-center justify-between p-6 border-b border-gray-800 last:border-0 hover:bg-gray-800/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-brandPurple group-hover:bg-brandPurple group-hover:text-white transition-all">
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <p className="text-white font-bold">{slip.month} {slip.year}</p>
                        <p className="text-xs text-textMuted">วันที่จ่าย: {slip.date || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden sm:block">
                        <p className="text-white font-bold">฿{slip.netPay}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${
                          slip.status === 'Paid' ? 'text-brandGreen' : 'text-brandOrange'
                        }`}>{slip.status || 'Draft'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all" title="View Detail">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-brandPurple hover:bg-brandPurple/10 rounded-lg transition-all" title="Download PDF">
                          <Download size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
