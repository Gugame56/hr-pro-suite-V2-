"use client";

import { useState, useEffect, useMemo } from "react";
import { Presentation, Calendar, Clock, MapPin, Loader2, Search, Plus, Pencil, Trash2, X, History } from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { useCanManage } from "@/lib/useCanManage";

type Meeting = {
  id?: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  organizer?: string;
  agenda?: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatDateHeader = (d: string) => {
  if (d === todayStr()) return "วันนี้";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d || "ไม่ระบุวันที่";
  return date.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export default function MeetingsPage() {
  // Admin/Manager only may add/edit/delete meetings; employees view read-only.
  const canManage = useCanManage();
  const [items, setItems] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState<Meeting>({
    title: "", date: "", startTime: "", endTime: "", location: "", organizer: "", agenda: "",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/meetings`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดการประชุม", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return items.filter((m) =>
      m.title?.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q) || m.organizer?.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  // Group by date; upcoming (>= today) ascending, past descending below.
  const { upcomingGroups, pastGroups } = useMemo(() => {
    const today = todayStr();
    const groups: Record<string, Meeting[]> = {};
    for (const m of filteredItems) {
      const key = m.date || "ไม่ระบุวันที่";
      (groups[key] ||= []).push(m);
    }
    const sortRows = (rows: Meeting[]) => rows.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    const entries = Object.entries(groups).map(([d, rows]) => [d, sortRows(rows)] as const);
    const up = entries.filter(([d]) => d >= today).sort((a, b) => a[0].localeCompare(b[0]));
    const pa = entries.filter(([d]) => d < today).sort((a, b) => b[0].localeCompare(a[0]));
    return { upcomingGroups: up, pastGroups: pa };
  }, [filteredItems]);

  const openAddModal = () => {
    setEditing(null);
    setFormData({ title: "", date: todayStr(), startTime: "", endTime: "", location: "", organizer: "", agenda: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Meeting) => {
    setEditing(item);
    setFormData({
      title: item.title || "", date: item.date || "", startTime: item.startTime || "", endTime: item.endTime || "",
      location: item.location || "", organizer: item.organizer || "", agenda: item.agenda || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...formData } : { ...formData };
    try {
      const res = await fetch("/api/meetings", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editing ? "อัปเดตการประชุมสำเร็จ" : "เพิ่มการประชุมสำเร็จ");
      await fetchItems();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการประชุมนี้?")) return;
    try {
      const res = await fetch(`/api/meetings?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบการประชุมสำเร็จ");
      await fetchItems();
    } catch {
      showNotification("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  const renderRow = (item: Meeting, isPast: boolean) => (
    <div key={item.id}
      className={`flex gap-4 bg-cardDark border border-gray-800 rounded-2xl p-4 hover:border-brandPurple/40 transition-all group ${isPast ? "opacity-75 hover:opacity-100" : ""}`}>
      {/* Time block */}
      <div className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-gray-800/40 shrink-0 min-w-[72px]">
        <span className="text-white font-bold text-sm leading-none">{item.startTime || "--:--"}</span>
        {item.endTime && <span className="text-textMuted text-[10px] mt-1">{item.endTime}</span>}
      </div>
      {/* Accent */}
      <div className={`w-1 rounded-full shrink-0 ${isPast ? "bg-gray-700" : "bg-brandPurple"}`} />
      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-white font-semibold leading-snug group-hover:text-brandPurple transition-colors">{item.title}</h4>
          {canManage && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-textMuted text-xs">
          {item.location && <span className="flex items-center gap-1"><MapPin size={12} /> {item.location}</span>}
          {item.organizer && (
            <span className="flex items-center gap-1.5">
              <span style={gradientStyle(item.organizer)} className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white">{initials(item.organizer)}</span>
              {item.organizer}
            </span>
          )}
        </div>
        {item.agenda && <p className="text-textMuted text-xs mt-2 line-clamp-2 whitespace-pre-wrap">{item.agenda}</p>}
      </div>
    </div>
  );

  const renderGroup = ([date, rows]: readonly [string, Meeting[]], isPast: boolean) => {
    const isToday = date === todayStr();
    return (
      <div key={date}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} className={isToday ? "text-brandPurple" : isPast ? "text-gray-500" : "text-brandPurple"} />
          <h3 className={`text-sm font-semibold ${isToday ? "text-brandPurple" : "text-white"}`}>{formatDateHeader(date)}</h3>
          <span className="text-xs text-textMuted">· {rows.length} การประชุม</span>
          <div className="flex-1 h-px bg-gray-800 ml-2" />
        </div>
        <div className="space-y-2">{rows.map((m) => renderRow(m, isPast))}</div>
      </div>
    );
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
          <h2 className="text-2xl font-bold text-white">จัดประชุม (Meetings)</h2>
          <p className="text-textMuted text-sm">กำหนดการและวาระการประชุมขององค์กรที่พนักงานควรทราบ</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มการประชุม
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input type="text" placeholder="ค้นหาหัวข้อ, สถานที่, ผู้จัด..."
          className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Agenda */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดการประชุม...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <Presentation className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-textMuted">ไม่พบการประชุม</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingGroups.length > 0 && (
            <section className="space-y-5">
              {upcomingGroups.map((g) => renderGroup(g, false))}
            </section>
          )}
          {pastGroups.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center gap-2 pt-2">
                <History size={15} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wide">ประชุมที่ผ่านมา</h3>
                <div className="flex-1 h-px bg-gray-800 ml-2" />
              </div>
              {pastGroups.map((g) => renderGroup(g, true))}
            </section>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editing ? "แก้ไขการประชุม" : "เพิ่มการประชุม"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หัวข้อการประชุม</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="เช่น ประชุมประจำเดือน" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานที่ / ห้อง</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="เช่น ห้องประชุม A" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เวลาเริ่ม</label>
                  <input type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">เวลาสิ้นสุด</label>
                  <input type="time" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ผู้จัดประชุม</label>
                <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.organizer} onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} placeholder="เช่น ฝ่ายบุคคล" />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วาระการประชุม</label>
                <textarea rows={4} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white resize-none"
                  value={formData.agenda} onChange={(e) => setFormData({ ...formData, agenda: e.target.value })} placeholder="หัวข้อและวาระที่จะหารือ..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editing ? "บันทึกการแก้ไข" : "บันทึกการประชุม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
