"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Building2, Layers, UserCircle, LayoutGrid, List,
  FileSpreadsheet, FileText, FileDown, Upload, UserCog,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exporters";
import { useCanManage } from "@/lib/useCanManage";

type Department = {
  id?: string;
  name?: string;
  description?: string;
  manager?: string;
};

const EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "name", label: "ชื่อแผนก" },
  { key: "description", label: "คำอธิบาย" },
  { key: "manager", label: "ผู้จัดการ" },
];

export default function DepartmentsPage() {
  // Admin/Manager only may add/edit/delete the org structure; employees view it.
  const canManage = useCanManage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [managerFilter, setManagerFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Department>({ name: "", description: "", manager: "" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (Array.isArray(data)) setDepartments(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredDepartments = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return departments.filter((dept) => {
      const matchesSearch =
        dept.name?.toLowerCase().includes(q) ||
        dept.description?.toLowerCase().includes(q) ||
        dept.manager?.toLowerCase().includes(q);
      const matchesManager =
        managerFilter === "all" ||
        (managerFilter === "assigned" ? !!dept.manager : !dept.manager);
      return matchesSearch && matchesManager;
    });
  }, [departments, searchTerm, managerFilter]);

  const stats = useMemo(() => ({
    total: departments.length,
    withManager: departments.filter((d) => d.manager).length,
    withoutManager: departments.filter((d) => !d.manager).length,
  }), [departments]);

  const openAddModal = () => {
    setEditingDepartment(null);
    setFormData({ name: "", description: "", manager: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name || "",
      description: dept.description || "",
      manager: dept.manager || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingDepartment ? "PATCH" : "POST";
    const body = editingDepartment ? { id: editingDepartment.id, ...formData } : formData;
    try {
      const res = await fetch("/api/departments", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingDepartment ? "อัปเดตข้อมูลแผนกสำเร็จ" : "เพิ่มแผนกสำเร็จ");
      await fetchDepartments();
      setIsModalOpen(false);
    } catch {
      showNotification("บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแผนกนี้?")) return;
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบแผนกสำเร็จ");
      await fetchDepartments();
    } catch {
      showNotification("ลบข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let ok = 0;
      for (const row of rows) {
        const res = await fetch("/api/departments", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
        });
        if (res.ok) ok++;
      }
      showNotification(`นำเข้าแผนก ${ok}/${rows.length} รายการสำเร็จ`);
      await fetchDepartments();
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
          <h2 className="text-2xl font-bold text-white">จัดการแผนก (Department Management)</h2>
          <p className="text-textMuted text-sm">โครงสร้างองค์กรและการบริหารจัดการฝ่ายงาน</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
          >
            <Plus size={18} /> เพิ่มแผนก
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Building2 size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">จำนวนแผนกทั้งหมด</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-brandGreen/10 text-brandGreen rounded-xl"><UserCircle size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">มีผู้จัดการแล้ว</p>
            <p className="text-2xl font-bold text-white">{stats.withManager}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-brandOrange/10 text-brandOrange rounded-xl"><Layers size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">ยังไม่มีผู้จัดการ</p>
            <p className="text-2xl font-bold text-white">{stats.withoutManager}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อแผนก, คำอธิบาย, ผู้จัดการ..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple"
        >
          <option value="all">ทุกแผนก</option>
          <option value="assigned">มีผู้จัดการ</option>
          <option value="unassigned">ยังไม่มีผู้จัดการ</option>
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
        <ToolBtn onClick={() => exportCsv(filteredDepartments, EXPORT_COLUMNS, "departments.csv")} icon={<FileDown size={15} />} label="CSV" />
        <ToolBtn onClick={() => exportExcel(filteredDepartments, EXPORT_COLUMNS, "departments.xls")} icon={<FileSpreadsheet size={15} />} label="Excel" />
        <ToolBtn onClick={() => exportPdf("รายชื่อแผนก", filteredDepartments, EXPORT_COLUMNS)} icon={<FileText size={15} />} label="PDF" />
        {canManage && <ToolBtn onClick={() => fileInputRef.current?.click()} icon={importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} label="Import" />}
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        <span className="ml-auto text-xs text-textMuted">{filteredDepartments.length} / {departments.length} รายการ</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลแผนก</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDepartments.map((dept) => (
            <DepartmentCard key={dept.id} dept={dept} canManage={canManage} onEdit={() => openEditModal(dept)} onDelete={() => handleDelete(dept.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ชื่อแผนก</th>
                  <th className="px-6 py-4 font-semibold">คำอธิบาย</th>
                  <th className="px-6 py-4 font-semibold">ผู้จัดการ</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div style={gradientStyle(dept.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {initials(dept.name)}
                        </div>
                        <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-textMuted">{dept.description || "-"}</td>
                    <td className="px-6 py-4 text-textMuted">{dept.manager || "-"}</td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(dept)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingDepartment ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อแผนก</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น ฝ่ายทรัพยากรบุคคล" />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">คำอธิบาย</label>
                <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="รายละเอียดหน้าที่ของแผนก..." />
              </div>
              <div>
                <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><UserCog size={12} /> ผู้จัดการแผนก</label>
                <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.manager} onChange={(e) => setFormData({ ...formData, manager: e.target.value })} placeholder="ชื่อ-นามสกุล ผู้จัดการ" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingDepartment ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
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

function DepartmentCard({ dept, canManage, onEdit, onDelete }: { dept: Department; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden group hover:border-brandPurple/50 transition-all shadow-lg">
      {/* Gradient header — unique per department */}
      <div style={gradientStyle(dept.id)} className="h-20 relative">
        <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-2xl bg-cardDark border-4 border-cardDark flex items-center justify-center">
          <div style={gradientStyle(dept.id)} className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold">
            {initials(dept.name)}
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
        <h3 className="text-white font-bold leading-tight">{dept.name}</h3>
        <p className="text-textMuted text-xs mt-1 line-clamp-2 min-h-[2rem]">{dept.description || "ไม่มีคำอธิบาย"}</p>
        <div className="mt-3 space-y-1.5 text-xs text-textMuted">
          <p className="flex items-center gap-2">
            <UserCog size={13} />
            {dept.manager
              ? <span className="text-white">{dept.manager}</span>
              : <span className="text-brandOrange">ยังไม่มีผู้จัดการ</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Minimal CSV parser supporting quoted fields. Maps Thai/English headers to keys. */
function parseCsv(text: string): Department[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const headerMap: Record<string, keyof Department> = {
    id: "id", name: "name", "ชื่อแผนก": "name", แผนก: "name",
    description: "description", คำอธิบาย: "description", รายละเอียด: "description",
    manager: "manager", ผู้จัดการ: "manager", หัวหน้า: "manager",
  };
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Department = {};
    headers.forEach((h, i) => {
      const key = headerMap[h];
      if (key) row[key] = cells[i]?.trim();
    });
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
