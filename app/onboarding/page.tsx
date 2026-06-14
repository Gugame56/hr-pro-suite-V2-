"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  CheckCircle2, Circle, ListChecks, Clock, AlertTriangle, CalendarDays,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi } from "@/lib/dashboardKit";

type Task = {
  id?: string;
  taskName?: string;
  category?: string;
  dueDate?: string;
  completed?: boolean | string;
};

// Category → Thai label + colour.
const CATEGORY_META: Record<string, { label: string; hex: string }> = {
  General: { label: "ทั่วไป", hex: "#6b7280" },
  Documents: { label: "เอกสาร", hex: "#3b82f6" },
  "IT Setup": { label: "ไอที/อุปกรณ์", hex: "#8b5cf6" },
  Meeting: { label: "แนะนำตัว/ประชุม", hex: "#f59e0b" },
  Policy: { label: "กฎระเบียบ", hex: "#10b981" },
};
const catMeta = (c?: string) => CATEGORY_META[c ?? ""] ?? { label: c || "อื่นๆ", hex: "#6b7280" };

const isDone = (t: Task) => t.completed === true || t.completed === "TRUE";
const todayStr = () => new Date().toISOString().split("T")[0];
const isOverdue = (t: Task) => !isDone(t) && !!t.dueDate && t.dueDate < todayStr();
const formatDate = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

export default function OnboardingPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({ taskName: "", category: "General", dueDate: "", completed: false });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      // Managed checklist — show all onboarding tasks, not just one employee's.
      const res = await fetch(`/api/onboarding`);
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const stats = useMemo(() => {
    const done = tasks.filter(isDone).length;
    const overdue = tasks.filter(isOverdue).length;
    return {
      total: tasks.length,
      done,
      pending: tasks.length - done,
      overdue,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  // Per-category progress (done / total), only categories that have tasks.
  const categoryProgress = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const t of tasks) {
      const key = t.category || "อื่นๆ";
      (map[key] ||= { total: 0, done: 0 }).total++;
      if (isDone(t)) map[key].done++;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  const allCategories = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))) as string[],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return tasks.filter((t) => {
      const matchesSearch = (t.taskName || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
      const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "done" ? isDone(t) : !isDone(t));
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [tasks, searchTerm, categoryFilter, statusFilter]);

  // Group filtered tasks by category; incomplete first, then by due date.
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      const key = t.category || "อื่นๆ";
      (groups[key] ||= []).push(t);
    }
    return Object.entries(groups).map(([cat, list]) => [
      cat,
      list.sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || (a.dueDate || "").localeCompare(b.dueDate || "")),
    ] as const);
  }, [filteredTasks]);

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ taskName: "", category: "General", dueDate: todayStr(), completed: false });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({ taskName: task.taskName || "", category: task.category || "General", dueDate: task.dueDate || "", completed: isDone(task) });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingTask ? "PATCH" : "POST";
    const body = editingTask ? { id: editingTask.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/onboarding", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingTask ? "อัปเดตรายการ Onboarding สำเร็จ" : "เพิ่มรายการ Onboarding สำเร็จ");
      await fetchTasks();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const next = !isDone(task);
    // Optimistic update.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, completed: next }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      showNotification(next ? "บันทึกว่าทำเสร็จแล้ว" : "ยกเลิกสถานะเสร็จสิ้น");
      await fetchTasks();
    } catch {
      showNotification("เกิดข้อผิดพลาดในการอัปเดตสถานะ", "error");
      await fetchTasks();
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;
    try {
      const res = await fetch(`/api/onboarding?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบรายการ Onboarding สำเร็จ");
      await fetchTasks();
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
          <h2 className="text-2xl font-bold text-white">ปฐมนิเทศพนักงานใหม่ (Onboarding)</h2>
          <p className="text-textMuted text-sm">ติดตามความคืบหน้าการเตรียมความพร้อมของพนักงานใหม่</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มรายการเช็คลิสต์
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<ListChecks size={22} />} tint="bg-blue-500/10 text-blue-500" label="รายการทั้งหมด" value={stats.total} />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="ทำเสร็จแล้ว" value={stats.done} />
        <Kpi icon={<Clock size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="คงเหลือ" value={stats.pending} />
        <Kpi icon={<AlertTriangle size={22} />} tint="bg-brandRed/10 text-brandRed" label="เกินกำหนด" value={stats.overdue} />
      </div>

      {/* Progress dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall completion ring */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center">
          <ProgressRing pct={stats.pct} />
          <p className="text-sm font-semibold text-white mt-4">ความคืบหน้าโดยรวม</p>
          <p className="text-textMuted text-xs">{stats.done} / {stats.total} รายการเสร็จสิ้น</p>
        </div>

        {/* Per-category progress */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">ความคืบหน้าตามหมวดหมู่</h3>
          <p className="text-textMuted text-xs mb-5">สัดส่วนงานที่เสร็จในแต่ละหมวด</p>
          {categoryProgress.length === 0 ? (
            <p className="text-textMuted text-xs italic">ยังไม่มีรายการ</p>
          ) : (
            <div className="space-y-4">
              {categoryProgress.map(([cat, { total, done }]) => {
                const meta = catMeta(cat);
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 text-white font-medium">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.hex }} /> {meta.label}
                      </span>
                      <span className="text-textMuted">{done}/{total} <span className="text-gray-500">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหากิจกรรม Onboarding..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกหมวดหมู่</option>
          {allCategories.map((c) => <option key={c} value={c}>{catMeta(c).label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทั้งหมด</option>
          <option value="pending">ยังไม่เสร็จ</option>
          <option value="done">เสร็จแล้ว</option>
        </select>
        <span className="lg:ml-auto text-xs text-textMuted">{filteredTasks.length} / {tasks.length} รายการ</span>
      </div>

      {/* Checklist grouped by category */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <ListChecks className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-textMuted">ไม่พบรายการ Onboarding</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTasks.map(([cat, list]) => {
            const meta = catMeta(cat);
            const done = list.filter(isDone).length;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.hex }} />
                  <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                  <span className="text-xs text-textMuted">· {done}/{list.length} เสร็จ</span>
                  <div className="flex-1 h-px bg-gray-800 ml-2" />
                </div>
                <div className="space-y-2">
                  {list.map((task) => {
                    const done = isDone(task);
                    const overdue = isOverdue(task);
                    return (
                      <div key={task.id}
                        className={`flex items-center gap-3 bg-cardDark border rounded-2xl p-4 transition-all group ${
                          done ? "border-gray-800/60" : "border-gray-800 hover:border-brandPurple/40"
                        }`}>
                        <button onClick={() => handleToggleComplete(task)}
                          className={`transition-colors shrink-0 ${done ? "text-brandGreen" : "text-gray-500 hover:text-brandPurple"}`}
                          title={done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}>
                          {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${done ? "text-gray-500 line-through" : "text-white"}`}>{task.taskName}</p>
                          {task.dueDate && (
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${overdue ? "text-brandRed" : "text-textMuted"}`}>
                              <CalendarDays size={11} /> {formatDate(task.dueDate)}
                              {overdue && <span className="ml-1 font-bold">· เกินกำหนด</span>}
                            </p>
                          )}
                        </div>
                        {canManage && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEditModal(task)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={15} /></button>
                            <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editingTask ? "แก้ไขรายการ Onboarding" : "เพิ่มรายการ Onboarding"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อกิจกรรม / หัวข้อ</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.taskName} onChange={(e) => setFormData({ ...formData, taskName: e.target.value })} placeholder="เช่น ส่งเอกสารสัญญาจ้าง" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หมวดหมู่</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="General">ทั่วไป</option>
                    <option value="Documents">เอกสาร</option>
                    <option value="IT Setup">ไอที/อุปกรณ์</option>
                    <option value="Meeting">แนะนำตัว/ประชุม</option>
                    <option value="Policy">กฎระเบียบ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่กำหนด</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-800 bg-cardDark text-brandPurple focus:ring-brandPurple"
                  checked={formData.completed} onChange={(e) => setFormData({ ...formData, completed: e.target.checked })} />
                <span className="text-sm text-white font-medium">ทำเสร็จสิ้นแล้ว</span>
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingTask ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pure-CSS progress ring showing a single completion percentage. */
function ProgressRing({ pct }: { pct: number }) {
  const background = `conic-gradient(#8b5cf6 ${pct * 3.6}deg, #1f2937 ${pct * 3.6}deg)`;
  return (
    <div className="relative w-36 h-36">
      <div className="w-full h-full rounded-full" style={{ background }} />
      <div className="absolute inset-[16px] rounded-full bg-cardDark flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white leading-none">{pct}<span className="text-lg">%</span></span>
        <span className="text-[10px] text-textMuted mt-1">เสร็จสิ้น</span>
      </div>
    </div>
  );
}
