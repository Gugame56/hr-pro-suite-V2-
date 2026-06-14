"use client";

import { useState, useEffect, useMemo } from "react";
import { Plane, Calendar, MapPin, Users, Loader2, Search, Plus, Pencil, Trash2, X, History } from "lucide-react";
import { gradientStyle } from "@/lib/avatarColor";
import { useCanManage } from "@/lib/useCanManage";

type Trip = {
  id?: string;
  tripName?: string;
  date?: string;
  location?: string;
  description?: string;
  maxParticipants?: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatDate = (d?: string) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const daysUntil = (d?: string) => {
  if (!d) return NaN;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return NaN;
  return Math.round((date.getTime() - new Date(todayStr()).getTime()) / 86400000);
};

export default function CompanyTripsPage() {
  // Admin/Manager only may add/edit/delete company trips; employees view read-only.
  const canManage = useCanManage();
  const [items, setItems] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [formData, setFormData] = useState<Trip>({ tripName: "", date: "", location: "", description: "", maxParticipants: "" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/company-trips`);
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดทริป", "error");
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
    return items.filter((t) =>
      t.tripName?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const { upcoming, past } = useMemo(() => {
    const today = todayStr();
    const up = filteredItems.filter((t) => (t.date || "") >= today).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const pa = filteredItems.filter((t) => (t.date || "") < today).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { upcoming: up, past: pa };
  }, [filteredItems]);

  const openAddModal = () => {
    setEditing(null);
    setFormData({ tripName: "", date: todayStr(), location: "", description: "", maxParticipants: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Trip) => {
    setEditing(item);
    setFormData({
      tripName: item.tripName || "", date: item.date || "", location: item.location || "",
      description: item.description || "", maxParticipants: item.maxParticipants || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...formData } : { ...formData };
    try {
      const res = await fetch("/api/company-trips", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editing ? "อัปเดตทริปสำเร็จ" : "เพิ่มทริปสำเร็จ");
      await fetchItems();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบทริปนี้?")) return;
    try {
      const res = await fetch(`/api/company-trips?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบทริปสำเร็จ");
      await fetchItems();
    } catch {
      showNotification("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  const renderCard = (item: Trip, i: number, isPast: boolean) => {
    const d = daysUntil(item.date);
    const countdown = !Number.isFinite(d) ? null : d === 0 ? "วันนี้" : d > 0 ? `อีก ${d} วัน` : `ผ่านมาแล้ว`;
    return (
      <div key={item.id || i}
        className={`bg-cardDark border border-gray-800 rounded-2xl overflow-hidden group hover:border-brandPurple/50 transition-all shadow-lg ${isPast ? "opacity-75 hover:opacity-100" : ""}`}>
        {/* Gradient banner */}
        <div style={gradientStyle(item.id || item.tripName)} className="h-24 relative flex items-center justify-center">
          <Plane className="text-white/80" size={32} />
          {countdown && (
            <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm ${
              isPast ? "bg-black/30 text-white/80" : d <= 7 ? "bg-white/90 text-gray-900" : "bg-black/30 text-white"
            }`}>
              {countdown}
            </span>
          )}
          {canManage && (
            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEditModal(item)} className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-black/30 hover:bg-brandRed rounded-lg text-white"><Trash2 size={14} /></button>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-white font-bold leading-tight group-hover:text-brandPurple transition-colors">{item.tripName}</h3>
          <div className="mt-3 space-y-1.5 text-xs text-textMuted">
            {item.date && <p className="flex items-center gap-2"><Calendar size={13} /> {formatDate(item.date)}</p>}
            {item.location && <p className="flex items-center gap-2"><MapPin size={13} /> {item.location}</p>}
            {item.maxParticipants && <p className="flex items-center gap-2"><Users size={13} /> {item.maxParticipants} คน</p>}
          </div>
          {item.description && <p className="text-textMuted text-xs mt-3 line-clamp-2 whitespace-pre-wrap">{item.description}</p>}
        </div>
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
          <h2 className="text-2xl font-bold text-white">ทริปบริษัท (Company Trips)</h2>
          <p className="text-textMuted text-sm">กิจกรรมท่องเที่ยวและทริปประจำปีเพื่อสร้างความสัมพันธ์ในทีม</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มทริป
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input type="text" placeholder="ค้นหาชื่อทริป, สถานที่..."
          className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดทริป...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <Plane className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-textMuted">ไม่พบทริปบริษัท</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Plane size={15} className="text-brandPurple" />
                <h3 className="text-sm font-semibold text-white">ทริปที่กำลังจะมาถึง</h3>
                <span className="text-xs text-textMuted">· {upcoming.length} ทริป</span>
                <div className="flex-1 h-px bg-gray-800 ml-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {upcoming.map((item, i) => renderCard(item, i, false))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History size={15} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-white">ทริปที่ผ่านมา</h3>
                <span className="text-xs text-textMuted">· {past.length} ทริป</span>
                <div className="flex-1 h-px bg-gray-800 ml-2" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {past.map((item, i) => renderCard(item, i, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editing ? "แก้ไขทริปบริษัท" : "เพิ่มทริปบริษัท"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อทริป</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.tripName} onChange={(e) => setFormData({ ...formData, tripName: e.target.value })} placeholder="เช่น ทริปประจำปี เกาะสมุย" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานที่</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="เช่น เกาะสมุย" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จำนวนผู้เข้าร่วม (คน)</label>
                <input type="number" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.maxParticipants} onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })} placeholder="เช่น 50" />
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รายละเอียด</label>
                <textarea rows={4} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white resize-none"
                  value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="กำหนดการและรายละเอียดทริป..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editing ? "บันทึกการแก้ไข" : "บันทึกทริป"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
