"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  Briefcase, ShieldCheck, BadgeCheck, Building2, LayoutGrid, List,
  FileSpreadsheet, FileText, FileDown, Upload,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exporters";
import { useCanManage } from "@/lib/useCanManage";

type Position = {
  id?: string;
  title?: string;
  grade?: string;
  description?: string;
  department?: string;
};

const EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "ตำแหน่ง" },
  { key: "grade", label: "ระดับ" },
  { key: "department", label: "แผนก" },
  { key: "description", label: "คำอธิบาย" },
];

export default function PositionsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<Position>({ title: "", grade: "", description: "", department: "" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      if (Array.isArray(data)) setPositions(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลตำแหน่ง", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const departments = useMemo(
    () => Array.from(new Set(positions.map((p) => p.department).filter(Boolean))) as string[],
    [positions]
  );

  const filteredPositions = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return positions.filter((pos) => {
      const matchesSearch =
        pos.title?.toLowerCase().includes(q) ||
        pos.description?.toLowerCase().includes(q) ||
        pos.grade?.toLowerCase().includes(q) ||
        pos.department?.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || pos.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [positions, searchTerm, deptFilter]);

  const stats = useMemo(() => ({
    total: positions.length,
    departments: new Set(positions.map((p) => p.department).filter(Boolean)).size,
    grades: new Set(positions.map((p) => p.grade).filter(Boolean)).size,
  }), [positions]);

  const openAddModal = () => {
    setEditingPosition(null);
    setFormData({ title: "", grade: "", description: "", department: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (pos: Position) => {
    setEditingPosition(pos);
    setFormData({
      title: pos.title || "",
      grade: pos.grade || "",
      description: pos.description || "",
      department: pos.department || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingPosition ? "PATCH" : "POST";
    const body = editingPosition ? { id: editingPosition.id, ...formData } : formData;
    try {
      const res = await fetch("/api/positions", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingPosition ? "อัปเดตข้อมูลตำแหน่งสำเร็จ" : "เพิ่มตำแหน่งสำเร็จ");
      await fetchPositions();
      setIsModalOpen(false);
    } catch {
      showNotification("บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่งนี้?")) return;
    try {
      const res = await fetch(`/api/positions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบตำแหน่งสำเร็จ");
      await fetchPositions();
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
        const res = await fetch("/api/positions", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
        });
        if (res.ok) ok++;
      }
      showNotification(`นำเข้าตำแหน่ง ${ok}/${rows.length} รายการสำเร็จ`);
      await fetchPositions();
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
          <h2 className="text-2xl font-bold text-white">จัดการตำแหน่ง (Position Management)</h2>
          <p className="text-textMuted text-sm">กำหนดตำแหน่งงานและระดับขั้นในโครงสร้างองค์กร</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
          >
            <Plus size={18} /> เพิ่มตำแหน่ง
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Briefcase size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">จำนวนตำแหน่งทั้งหมด</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><Building2 size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">แผนกที่เกี่ยวข้อง</p>
            <p className="text-2xl font-bold text-white">{stats.departments}</p>
          </div>
        </div>
        <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl"><BadgeCheck size={24} /></div>
          <div>
            <p className="text-textMuted text-xs uppercase font-semibold">จำนวนระดับ (Grade)</p>
            <p className="text-2xl font-bold text-white">{stats.grades}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อตำแหน่ง, ระดับ, แผนก..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple"
        >
          <option value="all">ทุกแผนก</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
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
        <ToolBtn onClick={() => exportCsv(filteredPositions, EXPORT_COLUMNS, "positions.csv")} icon={<FileDown size={15} />} label="CSV" />
        <ToolBtn onClick={() => exportExcel(filteredPositions, EXPORT_COLUMNS, "positions.xls")} icon={<FileSpreadsheet size={15} />} label="Excel" />
        <ToolBtn onClick={() => exportPdf("รายการตำแหน่งงาน", filteredPositions, EXPORT_COLUMNS)} icon={<FileText size={15} />} label="PDF" />
        {canManage && <ToolBtn onClick={() => fileInputRef.current?.click()} icon={importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} label="Import" />}
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        <span className="ml-auto text-xs text-textMuted">{filteredPositions.length} / {positions.length} รายการ</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredPositions.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <p className="text-textMuted">ไม่พบข้อมูลตำแหน่งงาน</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPositions.map((pos) => (
            <PositionCard key={pos.id} pos={pos} canManage={canManage} onEdit={() => openEditModal(pos)} onDelete={() => handleDelete(pos.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ตำแหน่ง</th>
                  <th className="px-6 py-4 font-semibold">ระดับ (Grade)</th>
                  <th className="px-6 py-4 font-semibold">แผนก</th>
                  <th className="px-6 py-4 font-semibold">คำอธิบาย</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div style={gradientStyle(pos.id)} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {initials(pos.title)}
                        </div>
                        <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{pos.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px] font-bold uppercase">{pos.grade || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 text-textMuted">{pos.department || "-"}</td>
                    <td className="px-6 py-4 text-textMuted truncate max-w-xs">{pos.description || "-"}</td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(pos)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(pos.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingPosition ? "แก้ไขตำแหน่งงาน" : "เพิ่มตำแหน่งงานใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อตำแหน่ง</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น Senior Software Engineer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><ShieldCheck size={12} /> ระดับ (Grade)</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} placeholder="เช่น Level 4" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-textMuted text-xs font-semibold mb-1 uppercase"><Building2 size={12} /> แผนกที่สังกัด</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="เช่น IT Department" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียดงาน</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="คำอธิบายหน้าที่และความรับผิดชอบ..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingPosition ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
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

function PositionCard({ pos, canManage, onEdit, onDelete }: { pos: Position; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden group hover:border-brandPurple/50 transition-all shadow-lg">
      {/* Gradient header — unique per position */}
      <div style={gradientStyle(pos.id)} className="h-20 relative">
        <div className="absolute -bottom-7 left-5 w-14 h-14 rounded-2xl bg-cardDark border-4 border-cardDark flex items-center justify-center">
          <div style={gradientStyle(pos.id)} className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold">
            {initials(pos.title)}
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-white font-bold leading-tight">{pos.title}</h3>
          {pos.grade && <span className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px] font-bold uppercase shrink-0">{pos.grade}</span>}
        </div>
        <p className="text-textMuted text-xs mt-1 line-clamp-2 min-h-[2rem]">{pos.description || "ไม่มีคำอธิบาย"}</p>
        <div className="mt-3 space-y-1.5 text-xs text-textMuted">
          <p className="flex items-center gap-2"><Building2 size={13} /> {pos.department || "-"}</p>
        </div>
      </div>
    </div>
  );
}

/** Minimal CSV parser supporting quoted fields. Maps Thai/English headers to keys. */
function parseCsv(text: string): Position[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const headerMap: Record<string, keyof Position> = {
    id: "id", title: "title", ตำแหน่ง: "title", "ชื่อตำแหน่ง": "title",
    grade: "grade", ระดับ: "grade",
    department: "department", แผนก: "department",
    description: "description", คำอธิบาย: "description", รายละเอียด: "description",
  };
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Position = {};
    headers.forEach((h, i) => {
      const key = headerMap[h];
      if (key) row[key] = cells[i]?.trim();
    });
    return row;
  }).filter((r) => r.title);
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
