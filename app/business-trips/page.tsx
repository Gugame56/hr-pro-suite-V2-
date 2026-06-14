"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2, Search, Plus, Pencil, Trash2, X,
  MapPin, Plane, Wallet, CheckCircle2, CalendarClock,
} from "lucide-react";
import { gradientStyle, initials } from "@/lib/avatarColor";
import { Kpi, DonutPanel, formatBaht, type Segment } from "@/lib/dashboardKit";
import { useCanManage } from "@/lib/useCanManage";

type Trip = {
  id?: string;
  employeeId?: string;
  employeeName?: string;
  destination?: string;
  purpose?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  status?: string;
};

// Status → Thai label + badge classes + donut hex.
const TRIP_STATUS: Record<string, { label: string; badge: string; hex: string }> = {
  Pending: { label: "รออนุมัติ", badge: "bg-brandOrange/10 text-brandOrange", hex: "#f59e0b" },
  Approved: { label: "อนุมัติแล้ว", badge: "bg-brandPurple/10 text-brandPurple", hex: "#8b5cf6" },
  Completed: { label: "เสร็จสิ้น", badge: "bg-brandGreen/10 text-brandGreen", hex: "#10b981" },
  Rejected: { label: "ปฏิเสธ", badge: "bg-brandRed/10 text-brandRed", hex: "#ef4444" },
};
const TRIP_ORDER = ["Pending", "Approved", "Completed", "Rejected"];

const TripStatusBadge = ({ status }: { status?: string }) => {
  const meta = TRIP_STATUS[status ?? ""] ?? { label: status || "UNKNOWN", badge: "bg-gray-700/50 text-gray-400", hex: "#6b7280" };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const formatDate = (d?: string) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};
const daysUntil = (d?: string) => {
  if (!d) return NaN;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return NaN;
  return Math.round((date.getTime() - new Date(todayStr()).getTime()) / 86400000);
};
const tripDays = (s?: string, e?: string) => {
  if (!s) return 0;
  const a = new Date(s);
  const b = e ? new Date(e) : a;
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
};

export default function BusinessTripsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState<Trip>({
    employeeId: "", employeeName: "", destination: "", purpose: "", startDate: "", endDate: "", budget: "", status: "Pending",
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/business-trips");
      const data = await res.json();
      if (Array.isArray(data)) setTrips(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลทริปธุรกิจ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredTrips = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return trips.filter((t) => {
      const matchesSearch =
        t.employeeName?.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q) || t.purpose?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trips, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: trips.length,
    approved: trips.filter((t) => t.status === "Approved").length,
    budget: trips.reduce((acc, t) => acc + (Number(t.budget) || 0), 0),
    upcoming: trips.filter((t) => {
      const d = daysUntil(t.startDate);
      return t.status !== "Rejected" && Number.isFinite(d) && d >= 0;
    }).length,
  }), [trips]);

  const statusSegments: Segment[] = useMemo(() =>
    TRIP_ORDER.map((s) => ({ label: TRIP_STATUS[s].label, value: trips.filter((t) => t.status === s).length, hex: TRIP_STATUS[s].hex }))
      .filter((s) => s.value > 0)
  , [trips]);

  const upcomingTrips = useMemo(() =>
    trips
      .filter((t) => {
        const d = daysUntil(t.startDate);
        return t.status !== "Rejected" && Number.isFinite(d) && d >= 0;
      })
      .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))
      .slice(0, 6)
  , [trips]);

  const openAddModal = () => {
    setEditingTrip(null);
    setFormData({ employeeId: "", employeeName: "", destination: "", purpose: "", startDate: "", endDate: "", budget: "", status: "Pending" });
    setIsModalOpen(true);
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData({
      employeeId: trip.employeeId || "", employeeName: trip.employeeName || "", destination: trip.destination || "",
      purpose: trip.purpose || "", startDate: trip.startDate || "", endDate: trip.endDate || "",
      budget: trip.budget || "", status: trip.status || "Pending",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingTrip ? "PATCH" : "POST";
    const body = editingTrip ? { id: editingTrip.id, ...formData } : formData;
    try {
      const res = await fetch("/api/business-trips", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingTrip ? "อัปเดตข้อมูลทริปธุรกิจสำเร็จ" : "เพิ่มทริปธุรกิจสำเร็จ");
      await fetchTrips();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบทริปนี้?")) return;
    try {
      const res = await fetch(`/api/business-trips?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบทริปธุรกิจสำเร็จ");
      await fetchTrips();
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
          <h2 className="text-2xl font-bold text-white">ทริปธุรกิจ (Business Trips)</h2>
          <p className="text-textMuted text-sm">จัดการการเดินทางเพื่อธุรกิจและภารกิจนอกสถานที่ของพนักงาน</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มทริปธุรกิจ
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Plane size={22} />} tint="bg-blue-500/10 text-blue-500" label="ทริปทั้งหมด" value={stats.total} sub="ทริป" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="อนุมัติแล้ว" value={stats.approved} sub="ทริป" />
        <Kpi icon={<Wallet size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="งบประมาณรวม" value={formatBaht(stats.budget)} />
        <Kpi icon={<CalendarClock size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="กำลังจะเดินทาง" value={stats.upcoming} sub="ทริป" />
      </div>

      {/* Distribution + upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutPanel title="สัดส่วนทริปตามสถานะ" subtitle="แบ่งตามสถานะการพิจารณา" segments={statusSegments} centerLabel="ทริป" />

        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Plane size={16} className="text-brandPurple" /> การเดินทางที่กำลังจะมาถึง</h3>
            <span className="text-xs text-textMuted">เรียงตามวันเริ่มเดินทาง</span>
          </div>
          <p className="text-textMuted text-xs mb-4">{upcomingTrips.length} ทริปที่ใกล้ถึงกำหนด</p>
          {upcomingTrips.length === 0 ? (
            <div className="h-[140px] flex flex-col items-center justify-center text-center">
              <CalendarClock className="text-gray-700 mb-2" size={32} />
              <p className="text-textMuted text-sm">ไม่มีทริปที่กำลังจะมาถึง</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {upcomingTrips.map((t) => {
                const d = daysUntil(t.startDate);
                return (
                  <div key={t.id} className="flex items-center gap-3 bg-gray-800/30 rounded-xl p-3">
                    <div style={gradientStyle(t.employeeId || t.employeeName)} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                      {initials(t.employeeName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{t.destination}</p>
                      <p className="text-textMuted text-xs truncate">{t.employeeName} · {formatDate(t.startDate)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      d <= 7 ? "bg-brandRed/10 text-brandRed" : "bg-brandOrange/10 text-brandOrange"
                    }`}>
                      {d === 0 ? "วันนี้" : `อีก ${d} วัน`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาชื่อพนักงาน, ปลายทาง, วัตถุประสงค์..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Pending">รออนุมัติ</option>
          <option value="Approved">อนุมัติแล้ว</option>
          <option value="Completed">เสร็จสิ้น</option>
          <option value="Rejected">ปฏิเสธ</option>
        </select>
        <span className="sm:ml-auto text-xs text-textMuted">{filteredTrips.length} / {trips.length} ทริป</span>
      </div>

      {/* Table */}
      <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูลทริปธุรกิจ...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-20 text-center"><p className="text-textMuted">ไม่พบข้อมูลทริปธุรกิจ</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">พนักงาน</th>
                  <th className="px-6 py-4 font-semibold">ปลายทาง / วัตถุประสงค์</th>
                  <th className="px-6 py-4 font-semibold">ช่วงเวลา</th>
                  <th className="px-6 py-4 font-semibold">งบประมาณ</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div style={gradientStyle(trip.employeeId || trip.employeeName)} className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {initials(trip.employeeName)}
                        </div>
                        <div>
                          <span className="text-white font-medium group-hover:text-brandPurple transition-colors block">{trip.employeeName}</span>
                          {trip.employeeId && <span className="text-textMuted text-xs">{trip.employeeId}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium flex items-center gap-1.5"><MapPin size={13} className="text-brandPurple" /> {trip.destination}</span>
                        <span className="text-textMuted text-xs italic truncate max-w-xs">{trip.purpose}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-textMuted">
                      <div>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</div>
                      <div className="text-xs text-gray-500">{tripDays(trip.startDate, trip.endDate)} วัน</div>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">{formatBaht(trip.budget)}</td>
                    <td className="px-6 py-4"><TripStatusBadge status={trip.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(trip)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(trip.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
              <h3 className="text-xl font-bold text-white">{editingTrip ? "แก้ไขข้อมูลทริปธุรกิจ" : "เพิ่มทริปธุรกิจใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รหัสพนักงาน</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} placeholder="EMP001" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อพนักงาน</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.employeeName} onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">จุดหมายปลายทาง</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} placeholder="เช่น กรุงเทพฯ, สิงคโปร์" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่เริ่ม</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วันที่สิ้นสุด</label>
                  <input required type="date" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">งบประมาณรวม (฿)</label>
                  <input required type="number" min="0" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Pending">Pending (รออนุมัติ)</option>
                    <option value="Approved">Approved (อนุมัติแล้ว)</option>
                    <option value="Completed">Completed (เสร็จสิ้น)</option>
                    <option value="Rejected">Rejected (ปฏิเสธ)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">วัตถุประสงค์การเดินทาง</label>
                <textarea rows={3} className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} placeholder="ระบุเหตุผลในการเดินทางธุรกิจ..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingTrip ? "บันทึกการแก้ไข" : "บันทึกทริปธุรกิจ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
