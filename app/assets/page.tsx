"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Laptop, Monitor, Smartphone, Tablet, Keyboard, Search, Plus,
  User, Tag, Loader2, Pencil, Trash2, X, Package, Boxes, CheckCircle2, Wrench, LayoutGrid, List,
} from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi } from "@/lib/dashboardKit";

type Asset = {
  id?: string;
  name?: string;
  assetId?: string;
  type?: string;
  owner?: string;
  status?: string;
};

// Icon per asset type.
const TYPE_ICON: Record<string, any> = {
  Laptop, Monitor, Mobile: Smartphone, Tablet, Peripheral: Keyboard, Other: Package,
};
const typeIcon = (type?: string, size = 24) => {
  const Icon = TYPE_ICON[type ?? ""] ?? Package;
  return <Icon size={size} />;
};

// Status → Thai label + badge classes.
const STATUS_META: Record<string, { label: string; badge: string }> = {
  "In Use": { label: "ใช้งานอยู่", badge: "bg-brandGreen/10 text-brandGreen" },
  Available: { label: "ว่าง", badge: "bg-brandPurple/10 text-brandPurple" },
  Repairing: { label: "ส่งซ่อม", badge: "bg-brandOrange/10 text-brandOrange" },
  Lost: { label: "สูญหาย", badge: "bg-brandRed/10 text-brandRed" },
};
const StatusBadge = ({ status }: { status?: string }) => {
  const meta = STATUS_META[status ?? ""] ?? { label: status || "UNKNOWN", badge: "bg-gray-700/50 text-gray-400" };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>;
};

const ALL_TYPES = ["Laptop", "Monitor", "Mobile", "Tablet", "Peripheral", "Other"];

export default function AssetsPage() {
  // Admin/Manager only may create/edit; employees have read-only access.
  const canManage = useCanManage();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"card" | "table">("card");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Asset>({ name: "", assetId: "", type: "Laptop", owner: "", status: "Available" });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => { fetchAssets(); }, []);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      if (Array.isArray(data)) setAssets(data);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูลทรัพย์สิน", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredAssets = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return assets.filter((a) => {
      const matchesSearch =
        (a.name || "").toLowerCase().includes(q) || (a.assetId || "").toLowerCase().includes(q) || (a.owner || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || a.type === typeFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [assets, searchTerm, typeFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: assets.length,
    inUse: assets.filter((a) => a.status === "In Use").length,
    available: assets.filter((a) => a.status === "Available").length,
    repairing: assets.filter((a) => a.status === "Repairing").length,
  }), [assets]);

  const openAddModal = () => {
    setEditingAsset(null);
    setFormData({ name: "", assetId: "", type: "Laptop", owner: "", status: "Available" });
    setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || "", assetId: asset.assetId || asset.id || "", type: asset.type || "Laptop",
      owner: asset.owner || "", status: asset.status || "Available",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingAsset ? "PATCH" : "POST";
    const body = editingAsset ? { id: editingAsset.id, ...formData } : { ...formData, employeeId: currentEmployeeId };
    try {
      const res = await fetch("/api/assets", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification(editingAsset ? "อัปเดตทรัพย์สินสำเร็จ" : "เพิ่มทรัพย์สินสำเร็จ");
      await fetchAssets();
      setIsModalOpen(false);
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm("คุณแน่ใจหรือไม่ว่าต้องการลบทรัพย์สินนี้?")) return;
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("ลบทรัพย์สินสำเร็จ");
      await fetchAssets();
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
          <h2 className="text-2xl font-bold text-white">ทรัพย์สิน (Assets)</h2>
          <p className="text-textMuted text-sm">จัดการอุปกรณ์และทรัพย์สินส่วนกลางของบริษัท</p>
        </div>
        {canManage && (
          <button onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20">
            <Plus size={18} /> เพิ่มทรัพย์สิน
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Boxes size={22} />} tint="bg-blue-500/10 text-blue-500" label="ทรัพย์สินทั้งหมด" value={stats.total} sub="ชิ้น" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="กำลังใช้งาน" value={stats.inUse} sub="ชิ้น" />
        <Kpi icon={<Package size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="ว่าง / พร้อมจ่าย" value={stats.available} sub="ชิ้น" />
        <Kpi icon={<Wrench size={22} />} tint="bg-brandOrange/10 text-brandOrange" label="ส่งซ่อม" value={stats.repairing} sub="ชิ้น" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" placeholder="ค้นหาชื่อ, รหัสทรัพย์สิน, ผู้ครอบครอง..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกประเภท</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="Available">ว่าง</option>
          <option value="In Use">ใช้งานอยู่</option>
          <option value="Repairing">ส่งซ่อม</option>
          <option value="Lost">สูญหาย</option>
        </select>
        <div className="flex bg-cardDark border border-gray-800 rounded-xl p-1">
          <button onClick={() => setView("card")} title="มุมมองการ์ด"
            className={`p-1.5 rounded-lg transition-colors ${view === "card" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}><LayoutGrid size={18} /></button>
          <button onClick={() => setView("table")} title="มุมมองตาราง"
            className={`p-1.5 rounded-lg transition-colors ${view === "table" ? "bg-brandPurple text-white" : "text-gray-400 hover:text-white"}`}><List size={18} /></button>
        </div>
        <span className="lg:ml-auto text-xs text-textMuted">{filteredAssets.length} / {assets.length} ชิ้น</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
          <p className="text-textMuted animate-pulse">กำลังโหลดข้อมูลทรัพย์สิน...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
          <Boxes className="mx-auto text-gray-700 mb-3" size={40} />
          <p className="text-textMuted">ไม่พบข้อมูลทรัพย์สิน</p>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset, i) => (
            <div key={asset.id || i} className="bg-cardDark border border-gray-800 rounded-2xl p-5 hover:border-brandPurple/50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-800 rounded-2xl text-brandPurple group-hover:bg-brandPurple group-hover:text-white transition-all">
                  {typeIcon(asset.type)}
                </div>
                <StatusBadge status={asset.status} />
              </div>
              <h3 className="text-base font-bold text-white leading-tight group-hover:text-brandPurple transition-colors">{asset.name}</h3>
              <p className="text-xs text-textMuted mt-1 flex items-center gap-1"><Tag size={12} /> {asset.assetId || asset.id}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white shrink-0"><User size={12} /></div>
                  <span className="text-xs text-textMuted truncate">{asset.owner || "ว่าง"}</span>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEditModal(asset)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(asset.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-cardDark border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800/30 text-textMuted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ทรัพย์สิน</th>
                  <th className="px-6 py-4 font-semibold">รหัส</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">ผู้ครอบครอง</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  {canManage && <th className="px-6 py-4 font-semibold text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg text-brandPurple">{typeIcon(asset.type, 16)}</div>
                        <span className="text-white font-medium group-hover:text-brandPurple transition-colors">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-textMuted font-mono text-xs">{asset.assetId || asset.id}</td>
                    <td className="px-6 py-4 text-textMuted">{asset.type}</td>
                    <td className="px-6 py-4 text-textMuted">{asset.owner || "ว่าง"}</td>
                    <td className="px-6 py-4"><StatusBadge status={asset.status} /></td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(asset)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(asset.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
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
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">{editingAsset ? "แก้ไขข้อมูลทรัพย์สิน" : "เพิ่มทรัพย์สินใหม่"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่ออุปกรณ์</label>
                <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น MacBook Pro M3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">รหัสทรัพย์สิน</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.assetId} onChange={(e) => setFormData({ ...formData, assetId: e.target.value })} placeholder="เช่น AST-001" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ประเภท</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ผู้ครอบครอง</label>
                  <input type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} placeholder="ชื่อพนักงาน" />
                </div>
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">สถานะ</label>
                  <select className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white"
                    value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Available">Available (ว่าง)</option>
                    <option value="In Use">In Use (ใช้งานอยู่)</option>
                    <option value="Repairing">Repairing (ส่งซ่อม)</option>
                    <option value="Lost">Lost (สูญหาย)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingAsset ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
