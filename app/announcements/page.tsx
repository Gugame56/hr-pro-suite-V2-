"use client";

import { useState, useEffect, useMemo } from "react";
import { Megaphone, Calendar, Loader2, Search, Plus, Pencil, Trash2, X, Sparkles } from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";

type Announcement = {
  id?: string;
  title?: string;
  category?: string;
  content?: string;
  date?: string;
};

const CAT_PALETTE = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#d946ef", "#84cc16"];

function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}
const catColor = (cat?: string) => (cat ? CAT_PALETTE[hashString(cat) % CAT_PALETTE.length] : "#6b7280");

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatDate = (d?: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};
const isRecent = (d?: string) => {
  if (!d) return false;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return false;
  return (new Date(todayStr()).getTime() - date.getTime()) / 86400000 <= 7 &&
    date.getTime() <= new Date(todayStr()).getTime();
};

export default function AnnouncementsPage() {
  // Admin/Manager only may add/edit/delete announcements; employees view read-only.
  const canManage = useCanManage();
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Announcement>({ title: "", category: "", content: "", date: "" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/announcements`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดประกาศ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const categories = useMemo(
    () => Array.from(new Set(items.map((a) => a.category).filter(Boolean))) as string[],
    [items]
  );

  // Newest first, filtered by search + category.
  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return items
      .filter((a) => {
        const matchesSearch = a.title?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
        const matchesCat = categoryFilter === "all" || a.category === categoryFilter;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [items, searchTerm, categoryFilter]);

  const openAddModal = () => {
    setEditing(null);
    setFormData({ title: "", category: "", content: "", date: todayStr() });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditing(item);
    setFormData({ title: item.title || "", category: item.category || "", content: item.content || "", date: item.date || "" });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...formData } : { ...formData };
    try {
      const res = await fetch("/api/announcements", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editing ? "อัปเดตประกาศสำเร็จ" : "เพิ่มประกาศสำเร็จ");
      await fetchItems();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้?")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบประกาศสำเร็จ");
      await fetchItems();
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
          <h2 className="text-2xl font-bold text-white">ประกาศ (Announcements)</h2>
          <p className="text-textMuted text-sm">ข่าวสารและประกาศจากองค์กรที่พนักงานทุกคนควรรับทราบ</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มประกาศ
          </button>
        )}
      </div>

      {/* Toolbar: search + category chips */}
      <div className="space-y-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาหัวข้อ, หมวดหมู่, เนื้อหา..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} label="ทั้งหมด" />
            {categories.map((c) => (
              <Chip key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} label={c} hex={catColor(c)} />
            ))}
          </div>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดประกาศ...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <Megaphone className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-textMuted">ไม่พบประกาศ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item, i) => {
            const hex = catColor(item.category);
            return (
              <article key={item.id || i}
                className="bg-cardDark border border-gray-800 rounded-2xl p-5 hover:border-brandPurple/40 transition-all group relative overflow-hidden"
                style={{ borderLeft: `3px solid ${hex}` }}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.category && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${hex}1a`, color: hex }}>
                        {item.category}
                      </span>
                    )}
                    {isRecent(item.date) && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brandGreen/10 text-brandGreen">
                        <Sparkles size={10} /> ใหม่
                      </span>
                    )}
                  </div>
                  {item.date && (
                    <span className="flex items-center gap-1 text-textMuted text-[11px] shrink-0">
                      <Calendar size={11} /> {formatDate(item.date)}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-bold leading-snug group-hover:text-brandPurple transition-colors">{item.title}</h3>
                <p className="text-textMuted text-sm mt-2 line-clamp-4 whitespace-pre-wrap">{item.content}</p>
                {canManage && (
                  <div className="mt-4 pt-3 border-t border-gray-800 flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={15} /></button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editing ? "แก้ไขประกาศ" : "เพิ่มประกาศ"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หัวข้อประกาศ</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น วันหยุดประจำปี 2569" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หมวดหมู่</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="เช่น ทั่วไป, HR, ด่วน" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียด</label>
                <textarea required rows={4} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white resize-none"
                  value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="เนื้อหาประกาศ..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editing ? "บันทึกการแก้ไข" : "บันทึกประกาศ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, hex }: { active: boolean; onClick: () => void; label: string; hex?: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? "bg-brandPurple/15 border-brandPurple text-white" : "bg-cardDark border-gray-800 text-textMuted hover:text-white hover:border-gray-700"
      }`}>
      {hex && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />}
      {label}
    </button>
  );
}
