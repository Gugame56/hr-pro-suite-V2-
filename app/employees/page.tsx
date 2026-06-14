"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, Users, UserCheck, UserMinus, X,
  LayoutGrid, List, FileSpreadsheet, FileText, FileDown, Upload, Mail, Building2,
  Wallet, ShieldCheck, KeyRound, CalendarDays,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exporters";
import { canManage as roleCanManage } from "@/lib/permissions";

type Role = "Admin" | "Manager" | "User";

type Employee = {
  id?: string;
  name?: string;
  nickname?: string;
  position?: string;
  department?: string;
  email?: string;
  status?: string;
  salary?: string;
  role?: string;
  startDate?: string; // hire date — drives leave entitlement (e.g. vacation after 1 year)
  // Account credentials — write-only from the form; never returned by the API.
  username?: string;
  password?: string;
};

const EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "nickname", label: "ชื่อเล่น" },
  { key: "position", label: "ตำแหน่ง" },
  { key: "department", label: "แผนก" },
  { key: "email", label: "อีเมล" },
  { key: "salary", label: "เงินเดือน" },
  { key: "role", label: "สิทธิ์" },
  { key: "status", label: "สถานะ" },
];

const formatSalary = (v?: string) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? `฿${n.toLocaleString()}` : "-";
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Employee>({
    name: "", nickname: "", position: "", department: "", email: "", status: "Active",
    salary: "", role: "User", startDate: "", username: "", password: "",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin and Manager may create accounts / set salaries. Other roles still see
  // the list but the management controls are hidden.
  const canManage = roleCanManage(currentRole);

  useEffect(() => {
    fetchEmployees();
    try {
      const session = JSON.parse(localStorage.getItem("hr_session") || "{}");
      setCurrentRole((session.role || "").toLowerCase());
    } catch {
      setCurrentRole("");
    }
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (Array.isArray(data)) setEmployees(data);
    } catch {
      showNotification("Error fetching employees", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[],
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name?.toLowerCase().includes(q) ||
        emp.nickname?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || emp.department === deptFilter;
      const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, deptFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === "Active").length,
    inactive: employees.filter((e) => e.status !== "Active").length,
  }), [employees]);

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: "", nickname: "", position: "", department: "", email: "", status: "Active",
      salary: "", role: "User", startDate: "", username: "", password: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name || "", nickname: emp.nickname || "", position: emp.position || "",
      department: emp.department || "", email: emp.email || "", status: emp.status || "Active",
      salary: emp.salary || "", role: emp.role || "User", startDate: emp.startDate || "",
      // Credentials are not returned by the API; leave blank to keep existing.
      username: "", password: "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingEmployee ? "PATCH" : "POST";
    const body = editingEmployee ? { id: editingEmployee.id, ...formData } : formData;
    try {
      const res = await fetch("/api/employees", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingEmployee ? "อัปเดตข้อมูลพนักงานสำเร็จ" : "เพิ่มพนักงานสำเร็จ");
      await fetchEmployees();
      setIsModalOpen(false);
    } catch {
      showNotification("บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานคนนี้?")) return;
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบพนักงานสำเร็จ");
      await fetchEmployees();
    } catch {
      showNotification("ลบข้อมูลไม่สำเร็จ", "error");
    }
  };

  // --- Import from CSV ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let ok = 0;
      for (const row of rows) {
        const res = await fetch("/api/employees", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
        });
        if (res.ok) ok++;
      }
      showNotification(`นำเข้าพนักงาน ${ok}/${rows.length} รายการสำเร็จ`);
      await fetchEmployees();
    } catch {
      showNotification("นำเข้าไฟล์ไม่สำเร็จ ตรวจสอบรูปแบบ CSV", "error");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          <h2 className="text-2xl font-bold text-white">จัดการพนักงาน (Employee Management)</h2>
          <p className="text-textMuted text-sm">บริหารจัดการข้อมูลและสถานะของบุคลากรทั้งหมดในองค์กร</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
          >
            <Plus size={18} /> เพิ่มพนักงาน
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Users size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">พนักงานทั้งหมด</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-brandGreen/10 text-brandGreen rounded-xl"><UserCheck size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">พนักงานปัจจุบัน</p>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl"><UserMinus size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">พนักงานที่พ้นสภาพ</p>
            <p className="text-2xl font-bold text-white">{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, ชื่อเล่น, อีเมล, ตำแหน่ง..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple"
        >
          <option value="all">ทุกแผนก</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>

        {/* View toggle */}
        <div className="flex bg-cardDark border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setView("card")}
            className={`p-1.5 rounded-lg transition-colors ${view === "card" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}
            title="มุมมองการ์ด"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}
            title="มุมมองตาราง"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Export / Import bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-textMuted mr-1">ส่งออก / นำเข้า:</span>
        <ToolBtn onClick={() => exportCsv(filteredEmployees, EXPORT_COLUMNS, "employees.csv")} icon={<FileDown size={15} />} label="CSV" />
        <ToolBtn onClick={() => exportExcel(filteredEmployees, EXPORT_COLUMNS, "employees.xls")} icon={<FileSpreadsheet size={15} />} label="Excel" />
        <ToolBtn onClick={() => exportPdf("รายชื่อพนักงาน", filteredEmployees, EXPORT_COLUMNS)} icon={<FileText size={15} />} label="PDF" />
        <ToolBtn onClick={() => fileInputRef.current?.click()} icon={importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} label="Import" />
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        <span className="ml-auto text-xs text-textMuted">{filteredEmployees.length} / {employees.length} รายการ</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลพนักงาน</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} canManage={canManage} onEdit={() => openEditModal(emp)} onDelete={() => handleDelete(emp.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">พนักงาน</th>
                  <th className="px-6 py-4 font-semibold">ตำแหน่ง / แผนก</th>
                  <th className="px-6 py-4 font-semibold">เงินเดือน / สิทธิ์</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div style={gradientStyle(emp.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {initials(emp.name)}
                        </div>
                        <div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors block">{emp.name}</span>
                          {emp.nickname && <span className="text-textMuted text-xs">({emp.nickname})</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{emp.position}</div>
                      <div className="text-textMuted text-xs">{emp.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{formatSalary(emp.salary)}</div>
                      {emp.role && <RoleBadge role={emp.role} />}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={emp.status} />
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(emp)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editingEmployee ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อ-นามสกุล</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อเล่น</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} placeholder="เช่น โบว์" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ตำแหน่ง</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">แผนก</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">อีเมล</label>
                <input type="email" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active (ทำงานอยู่)</option>
                    <option value="Inactive">Inactive (พ้นสภาพ)</option>
                    <option value="On Leave">On Leave (ลางาน)</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><Wallet size={12} /> เงินเดือน (บาท)</label>
                  <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="เช่น 25000"
                    className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><CalendarDays size={12} /> วันเริ่มงาน</label>
                  <input type="date"
                    className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                  <p className="text-[10px] text-textMuted mt-1">ใช้คำนวณสิทธิ์ลาพักร้อน (ครบ 1 ปี)</p>
                </div>
              </div>

              {/* Account & permissions — only an admin reaches this modal */}
              <div className="border-t border-gray-800 pt-4 space-y-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-brandPurple uppercase tracking-wide">
                  <ShieldCheck size={14} /> บัญชีผู้ใช้และสิทธิ์การเข้าถึง
                </p>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ระดับสิทธิ์ (Role)</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}>
                    <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
                    <option value="Manager">Manager (หัวหน้างาน)</option>
                    <option value="User">User (พนักงานทั่วไป)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อผู้ใช้ (อีเมลเข้าระบบ)</label>
                    <input type="text" autoComplete="off" placeholder={formData.email || "ใช้อีเมลพนักงานหากเว้นว่าง"}
                      className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                      value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><KeyRound size={12} /> รหัสผ่าน</label>
                    <input type="password" autoComplete="new-password"
                      placeholder={editingEmployee ? "เว้นว่างเพื่อคงรหัสเดิม" : "ตั้งรหัสผ่าน"}
                      className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                      value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                </div>
                <p className="text-[11px] text-textMuted">
                  ตั้งรหัสผ่านเพื่อสร้างบัญชีเข้าระบบให้พนักงาน — ระบบจะเก็บแบบเข้ารหัสและเชื่อมกับตาราง Users อัตโนมัติ
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingEmployee ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 bg-cardDark border border-gray-800 hover:border-brandPurple/50 hover:text-white text-gray-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
      {icon} {label}
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    Active: "bg-brandGreen/10 text-brandGreen",
    "On Leave": "bg-brandOrange/10 text-brandOrange",
    Inactive: "bg-gray-700/50 text-gray-400",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${map[status ?? ""] ?? "bg-gray-700/50 text-gray-400"}`}>
      {status?.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function EmployeeCard({ emp, canManage, onEdit, onDelete }: { emp: Employee; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden group hover:border-brandPurple/50 transition-all shadow-lg">
      {/* Gradient header — unique per employee */}
      <div style={gradientStyle(emp.id)} className="h-20 relative">
        <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-2xl bg-cardDark border-4 border-cardDark flex items-center justify-center">
          <div style={gradientStyle(emp.id)} className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold">
            {initials(emp.name)}
          </div>
        </div>
        {canManage && (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white"><Pencil size={14} /></button>
            <button onClick={onDelete} className="p-1.5 bg-black/30 hover:bg-brandRed rounded-lg text-white"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
      <div className="pt-9 px-5 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold leading-tight">{emp.name}</h3>
          <StatusBadge status={emp.status} />
        </div>
        {emp.nickname && <p className="text-textMuted text-xs mt-0.5">({emp.nickname})</p>}
        <p className="text-brandPurple text-sm font-medium mt-2">{emp.position}</p>
        <div className="mt-3 space-y-1.5 text-xs text-textMuted">
          <p className="flex items-center gap-2"><Building2 size={13} /> {emp.department || "-"}</p>
          <p className="flex items-center gap-2 truncate"><Mail size={13} /> {emp.email || "-"}</p>
          {canManage && (
            <p className="flex items-center gap-2"><Wallet size={13} /> {formatSalary(emp.salary)}</p>
          )}
        </div>
        {emp.role && <div className="mt-3"><RoleBadge role={emp.role} /></div>}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = {
    admin: "bg-brandPurple/10 text-brandPurple",
    manager: "bg-brandBlue/10 text-brandBlue",
    user: "bg-gray-700/50 text-gray-300",
  };
  const key = (role || "user").toLowerCase();
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${map[key] ?? "bg-gray-700/50 text-gray-300"}`}>
      {(role || "User").toUpperCase()}
    </span>
  );
}

/** Minimal CSV parser supporting quoted fields. Maps Thai/English headers to keys. */
function parseCsv(text: string): Employee[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const headerMap: Record<string, keyof Employee> = {
    id: "id", name: "name", "ชื่อ-นามสกุล": "name", ชื่อ: "name",
    nickname: "nickname", ชื่อเล่น: "nickname",
    position: "position", ตำแหน่ง: "position",
    department: "department", แผนก: "department",
    email: "email", อีเมล: "email",
    salary: "salary", เงินเดือน: "salary",
    role: "role", สิทธิ์: "role", ระดับสิทธิ์: "role",
    status: "status", สถานะ: "status",
  };
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Employee = {};
    headers.forEach((h, i) => {
      const key = headerMap[h];
      if (key) row[key] = cells[i]?.trim();
    });
    if (!row.status) row.status = "Active";
    return row;
  }).filter((r) => r.name);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
