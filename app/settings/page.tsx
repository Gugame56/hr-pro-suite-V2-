"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, Save, Building2, Users as UsersIcon, Clock, MapPin, Palette,
  Navigation, QrCode, RefreshCw, Camera, ShieldCheck, Plus, Check, Search,
} from "lucide-react";

type Settings = {
  // Company
  company_name: string;
  company_tax_id: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_currency: string;
  // Locale
  system_timezone: string;
  system_language: string;
  maintenance_mode: string;
  // Work hours
  work_start: string;
  work_end: string;
  work_days: string; // comma list of day indices "1,2,3,4,5"
  late_grace: string; // minutes
  // Attendance verification & geofence
  attendance_verify_gps: string;
  attendance_verify_qr: string;
  office_lat: string;
  office_lng: string;
  office_radius: string;
  attendance_qr_token: string;
  // Theme
  theme_accent: string;
};

const DEFAULTS: Settings = {
  company_name: "", company_tax_id: "", company_phone: "", company_email: "",
  company_address: "", company_currency: "THB",
  system_timezone: "Asia/Bangkok", system_language: "Thai", maintenance_mode: "Off",
  work_start: "09:00", work_end: "18:00", work_days: "1,2,3,4,5", late_grace: "15",
  attendance_verify_gps: "Off", attendance_verify_qr: "Off",
  office_lat: "", office_lng: "", office_radius: "200", attendance_qr_token: "",
  theme_accent: "#8B5CF6",
};

const TABS = [
  { id: "company", label: "บริษัท", icon: Building2 },
  { id: "users", label: "ผู้ใช้งาน", icon: UsersIcon },
  { id: "work", label: "เวลาทำงาน", icon: Clock },
  { id: "geofence", label: "พิกัดออฟฟิศ (Geofence)", icon: MapPin },
  { id: "theme", label: "ธีม", icon: Palette },
] as const;

const DOW = [
  { i: 0, label: "อา" }, { i: 1, label: "จ" }, { i: 2, label: "อ" }, { i: 3, label: "พ" },
  { i: 4, label: "พฤ" }, { i: 5, label: "ศ" }, { i: 6, label: "ส" },
];

const ACCENTS = ["#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#84CC16"];

const MOCK_USERS = [
  { name: "Admin HR", email: "admin@company.com", role: "admin" },
  { name: "สมชาย ใจดี", email: "somchai@company.com", role: "employee" },
  { name: "สมหญิง รักงาน", email: "somying@company.com", role: "employee" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("company");
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      showNotification("Error fetching settings", "error");
    }
  };

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      showNotification("บันทึกการตั้งค่าระบบสำเร็จ");
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const set = (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch }));

  const generateToken = () => {
    const token = `HRQR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    set({ attendance_qr_token: token });
    showNotification("สร้างรหัส QR ใหม่แล้ว อย่าลืมกดบันทึก");
  };

  const workDays = new Set((settings.work_days || "").split(",").filter(Boolean).map(Number));
  const toggleDay = (i: number) => {
    const next = new Set(workDays);
    next.has(i) ? next.delete(i) : next.add(i);
    set({ work_days: Array.from(next).sort((a, b) => a - b).join(",") });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
          notification.type === "error" ? "bg-red-500" : "bg-brandGreen"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">ตั้งค่าระบบ (System Settings)</h2>
          <p className="text-textMuted text-sm">กำหนดค่าพื้นฐานและการทำงานของระบบ HR Pro Suite</p>
        </div>
        <button onClick={() => handleSave()} disabled={isSaving}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20 disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกการตั้งค่า
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-cardDark border border-gray-800 rounded-2xl p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active ? "bg-brandPurple text-white shadow" : "text-textMuted hover:text-white hover:bg-gray-800"
              }`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ---------- COMPANY ---------- */}
      {tab === "company" && (
        <Section icon={<Building2 className="text-brandPurple" size={20} />} title="ข้อมูลองค์กร (Company)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="ชื่อบริษัท" value={settings.company_name} onChange={(v) => set({ company_name: v })} />
            <TextField label="เลขประจำตัวผู้เสียภาษี" value={settings.company_tax_id} onChange={(v) => set({ company_tax_id: v })} placeholder="0-0000-00000-00-0" />
            <TextField label="เบอร์โทรศัพท์" value={settings.company_phone} onChange={(v) => set({ company_phone: v })} placeholder="02-xxx-xxxx" />
            <TextField label="อีเมลติดต่อ" type="email" value={settings.company_email} onChange={(v) => set({ company_email: v })} />
            <div className="space-y-2 md:col-span-2">
              <label className="text-textMuted text-xs font-semibold uppercase">ที่อยู่บริษัท</label>
              <textarea rows={3} className={inputCls} value={settings.company_address} onChange={(e) => set({ company_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">สกุลเงิน</label>
              <select className={inputCls} value={settings.company_currency} onChange={(e) => set({ company_currency: e.target.value })}>
                <option value="THB">THB — บาท (฿)</option>
                <option value="USD">USD — Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="JPY">JPY — Yen (¥)</option>
              </select>
            </div>
          </div>
        </Section>
      )}

      {/* ---------- USERS ---------- */}
      {tab === "users" && (
        <Section icon={<UsersIcon className="text-brandPurple" size={20} />} title="ผู้ใช้งานระบบ (Users)"
          action={<button type="button" className="flex items-center gap-1.5 bg-brandPurple/10 hover:bg-brandPurple hover:text-white text-brandPurple text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"><Plus size={14} /> เพิ่มผู้ใช้</button>}>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-textMuted text-[10px] uppercase tracking-widest border-b border-gray-800">
                  <th className="px-2 py-3 font-semibold">ชื่อ</th>
                  <th className="px-2 py-3 font-semibold">อีเมล</th>
                  <th className="px-2 py-3 font-semibold">สิทธิ์</th>
                  <th className="px-2 py-3 font-semibold text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {MOCK_USERS.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-800/20">
                    <td className="px-2 py-3 text-white font-medium">{u.name}</td>
                    <td className="px-2 py-3 text-textMuted">{u.email}</td>
                    <td className="px-2 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${u.role === "admin" ? "bg-brandPurple/20 text-brandPurple" : "bg-brandBlue/20 text-brandBlue"}`}>
                        {u.role === "admin" ? "Admin" : "พนักงาน"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right"><span className="text-[10px] text-brandGreen font-bold uppercase">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ---------- WORK HOURS ---------- */}
      {tab === "work" && (
        <Section icon={<Clock className="text-brandPurple" size={20} />} title="เวลาทำงาน (Work Hours)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">เวลาเข้างาน</label>
              <input type="time" className={inputCls} value={settings.work_start} onChange={(e) => set({ work_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">เวลาเลิกงาน</label>
              <input type="time" className={inputCls} value={settings.work_end} onChange={(e) => set({ work_end: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">อนุโลมสาย (นาที)</label>
              <input type="number" min={0} className={inputCls} value={settings.late_grace} onChange={(e) => set({ late_grace: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-textMuted text-xs font-semibold uppercase">วันทำงาน</label>
            <div className="flex flex-wrap gap-2">
              {DOW.map((d) => {
                const on = workDays.has(d.i);
                return (
                  <button key={d.i} type="button" onClick={() => toggleDay(d.i)}
                    className={`w-11 h-11 rounded-xl text-sm font-bold transition-colors ${on ? "bg-brandPurple text-white" : "bg-gray-900/50 border border-gray-800 text-textMuted hover:text-white"}`}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">เขตเวลา (Timezone)</label>
              <select className={inputCls} value={settings.system_timezone} onChange={(e) => set({ system_timezone: e.target.value })}>
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-textMuted text-xs font-semibold uppercase">ภาษาหลัก (Language)</label>
              <select className={inputCls} value={settings.system_language} onChange={(e) => set({ system_language: e.target.value })}>
                <option value="Thai">ภาษาไทย (Thai)</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>
        </Section>
      )}

      {/* ---------- GEOFENCE ---------- */}
      {tab === "geofence" && (
        <Section icon={<MapPin className="text-brandPurple" size={20} />} title="การลงเวลา & พิกัดออฟฟิศ (Geofence)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ToggleRow icon={<Navigation size={16} />} title="ยืนยันด้วย GPS" desc="ต้องอยู่ในรัศมีออฟฟิศจึงลงเวลาได้"
              on={settings.attendance_verify_gps === "On"} onToggle={() => set({ attendance_verify_gps: settings.attendance_verify_gps === "On" ? "Off" : "On" })} />
            <ToggleRow icon={<QrCode size={16} />} title="ยืนยันด้วย QR Code" desc="ต้องสแกน QR ของออฟฟิศจึงลงเวลาได้"
              on={settings.attendance_verify_qr === "On"} onToggle={() => set({ attendance_verify_qr: settings.attendance_verify_qr === "On" ? "Off" : "On" })} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-textMuted text-xs font-semibold uppercase">ตำแหน่งออฟฟิศ (ค้นหา คลิกบนแผนที่ หรือลากหมุดเพื่อกำหนด)</label>
              <UseMyLocationButton onLocate={(lat, lng) => { set({ office_lat: lat.toFixed(6), office_lng: lng.toFixed(6) }); showNotification("ตั้งพิกัดเป็นตำแหน่งปัจจุบันแล้ว"); }} />
            </div>
            <PlaceSearch
              lat={parseFloat(settings.office_lat)} lng={parseFloat(settings.office_lng)}
              onPick={(lat, lng, title) => { set({ office_lat: lat.toFixed(6), office_lng: lng.toFixed(6) }); showNotification(`ตั้งพิกัดเป็น "${title}" แล้ว`); }}
              onError={(msg) => showNotification(msg, "error")}
            />
            <GeofenceMap lat={parseFloat(settings.office_lat)} lng={parseFloat(settings.office_lng)} radius={parseFloat(settings.office_radius) || 200}
              onChange={(lat, lng) => set({ office_lat: lat.toFixed(6), office_lng: lng.toFixed(6) })} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-textMuted text-[10px] font-semibold uppercase">Latitude</label>
                <input type="text" className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brandPurple"
                  value={settings.office_lat} onChange={(e) => set({ office_lat: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-textMuted text-[10px] font-semibold uppercase">Longitude</label>
                <input type="text" className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brandPurple"
                  value={settings.office_lng} onChange={(e) => set({ office_lng: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-textMuted text-[10px] font-semibold uppercase">รัศมี: <span className="text-white">{settings.office_radius} ม.</span></label>
                <input type="range" min={50} max={2000} step={10} className="w-full accent-brandPurple"
                  value={parseFloat(settings.office_radius) || 200} onChange={(e) => set({ office_radius: e.target.value })} />
              </div>
            </div>
          </div>

          {settings.attendance_verify_qr === "On" && (
            <div className="border-t border-gray-800 pt-5">
              <OfficeQr token={settings.attendance_qr_token} onRegenerate={generateToken} />
            </div>
          )}
        </Section>
      )}

      {/* ---------- THEME ---------- */}
      {tab === "theme" && (
        <Section icon={<Palette className="text-brandPurple" size={20} />} title="ธีม (Theme)">
          <div className="space-y-2">
            <label className="text-textMuted text-xs font-semibold uppercase">สีหลัก (Accent Color)</label>
            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((c) => {
                const active = settings.theme_accent === c;
                return (
                  <button key={c} type="button" onClick={() => set({ theme_accent: c })}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform hover:scale-110 ${active ? "ring-2 ring-offset-2 ring-offset-cardDark ring-white" : ""}`}
                    style={{ backgroundColor: c }}>
                    {active && <Check size={18} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="text-textMuted text-xs font-semibold uppercase">ตัวอย่าง</p>
            <div className="flex items-center gap-3">
              <button type="button" className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: settings.theme_accent }}>ปุ่มหลัก</button>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${settings.theme_accent}22`, color: settings.theme_accent }}>Badge</span>
              <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: settings.theme_accent }} />
              </div>
            </div>
            <p className="text-[11px] text-textMuted">การเลือกสีจะถูกบันทึกเป็นค่ากำหนดของระบบ และนำไปใช้กับธีมในการอัปเดตถัดไป</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
            <span className="text-sm text-white flex items-center gap-2"><ShieldCheck size={16} className="text-brandPurple" /> โหมดบำรุงรักษา (Maintenance)</span>
            <button type="button" onClick={() => set({ maintenance_mode: settings.maintenance_mode === "On" ? "Off" : "On" })}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.maintenance_mode === "On" ? "bg-brandGreen" : "bg-gray-700"}`}>
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance_mode === "On" ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
        </Section>
      )}
    </div>
  );
}

const inputCls = "w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brandPurple";

function Section({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-cardDark border border-gray-800 rounded-3xl p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}<h3 className="text-lg font-bold text-white">{title}</h3></div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-textMuted text-xs font-semibold uppercase">{label}</label>
      <input type={type} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ToggleRow({ icon, title, desc, on, onToggle }: { icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg h-fit ${on ? "bg-brandPurple/20 text-brandPurple" : "bg-gray-800 text-textMuted"}`}>{icon}</div>
        <div>
          <p className="text-sm text-white font-medium">{title}</p>
          <p className="text-[11px] text-textMuted mt-0.5">{desc}</p>
        </div>
      </div>
      <button type="button" onClick={onToggle}
        className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${on ? "bg-brandGreen" : "bg-gray-700"}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${on ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

type PlaceResult = { title: string; address: string; lat: number; lng: number };

function PlaceSearch({ lat, lng, onPick, onError }: {
  lat: number; lng: number;
  onPick: (lat: number, lng: number, title: string) => void;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ q });
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) { params.set("lat", String(lat)); params.set("lng", String(lng)); }
      const res = await fetch(`/api/places/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ค้นหาไม่สำเร็จ");
      setResults(data.results || []);
      setOpen(true);
      if ((data.results || []).length === 0) onError("ไม่พบสถานที่ที่ค้นหา");
    } catch (e: any) {
      onError(e.message || "ค้นหาสถานที่ไม่สำเร็จ");
      setResults([]); setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
            placeholder="ค้นหาสถานที่ เช่น ชื่อบริษัท อาคาร หรือที่อยู่"
            className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-brandPurple"
          />
        </div>
        <button type="button" onClick={search} disabled={busy}
          className="flex items-center gap-1.5 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 shrink-0">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} ค้นหา
        </button>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-cardDark border border-gray-800 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} type="button"
              onClick={() => { onPick(r.lat, r.lng, r.title); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-800/50 border-b border-gray-800 last:border-0 flex gap-3 items-start">
              <MapPin size={15} className="text-brandPurple mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{r.title}</p>
                {r.address && <p className="text-textMuted text-xs truncate">{r.address}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UseMyLocationButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy}
      onClick={() => {
        if (!navigator.geolocation) return;
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => { onLocate(pos.coords.latitude, pos.coords.longitude); setBusy(false); },
          () => setBusy(false),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }}
      className="flex items-center gap-1 text-xs text-brandPurple hover:underline font-semibold disabled:opacity-50">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />} ใช้ตำแหน่งปัจจุบัน
    </button>
  );
}

// ---- Google Maps JS loader (key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ----
let gmapsPromise: Promise<any> | null = null;
function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).google?.maps) return Promise.resolve((window as any).google.maps);
  if (gmapsPromise) return gmapsPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  gmapsPromise = new Promise((resolve, reject) => {
    if (!key) { reject(new Error("missing-key")); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&language=th&region=TH`;
    script.async = true;
    script.onload = () => resolve((window as any).google.maps);
    script.onerror = () => reject(new Error("load-failed"));
    document.body.appendChild(script);
  });
  return gmapsPromise;
}

function GeofenceMap({ lat, lng, radius, onChange }: {
  lat: number; lng: number; radius: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [error, setError] = useState<string | null>(null);

  const initLat = Number.isNaN(lat) ? 13.7563 : lat;
  const initLng = Number.isNaN(lng) ? 100.5018 : lng;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps || !containerRef.current || mapRef.current) return;

      const center = { lat: initLat, lng: initLng };
      const map = new maps.Map(containerRef.current, {
        center, zoom: 16, mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      const marker = new maps.Marker({ position: center, map, draggable: true });
      const circle = new maps.Circle({
        map, center, radius, strokeColor: "#8B5CF6", strokeWeight: 2,
        fillColor: "#8B5CF6", fillOpacity: 0.15,
      });

      const move = (la: number, ln: number) => {
        const p = { lat: la, lng: ln };
        marker.setPosition(p); circle.setCenter(p); onChangeRef.current(la, ln);
      };
      marker.addListener("dragend", () => {
        const p = marker.getPosition(); move(p.lat(), p.lng());
      });
      map.addListener("click", (e: any) => move(e.latLng.lat(), e.latLng.lng()));

      mapRef.current = map; markerRef.current = marker; circleRef.current = circle;
    }).catch((e) => {
      setError(e?.message === "missing-key"
        ? "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ในไฟล์ .env.local"
        : "โหลด Google Maps ไม่สำเร็จ ตรวจสอบ API key และการเปิดใช้ Maps JavaScript API + Places API");
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { circleRef.current?.setRadius(radius); }, [radius]);

  useEffect(() => {
    if (!markerRef.current || Number.isNaN(lat) || Number.isNaN(lng)) return;
    const cur = markerRef.current.getPosition();
    if (!cur || Math.abs(cur.lat() - lat) > 1e-7 || Math.abs(cur.lng() - lng) > 1e-7) {
      const p = { lat, lng };
      markerRef.current.setPosition(p);
      circleRef.current?.setCenter(p);
      mapRef.current?.panTo(p);
    }
  }, [lat, lng]);

  if (error) {
    return (
      <div className="w-full h-72 rounded-2xl border border-gray-800 bg-gray-900/40 flex items-center justify-center text-center px-6">
        <p className="text-textMuted text-sm">{error}</p>
      </div>
    );
  }
  return <div ref={containerRef} className="w-full h-72 rounded-2xl overflow-hidden border border-gray-800 z-0" />;
}

// ---- QR code generator (CDN, renders locally; token never leaves the browser) ----
let qrPromise: Promise<any> | null = null;
function loadQrLib(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).QRCode) return Promise.resolve((window as any).QRCode);
  if (qrPromise) return qrPromise;
  qrPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    script.onload = () => resolve((window as any).QRCode);
    document.body.appendChild(script);
  });
  return qrPromise;
}

function OfficeQr({ token, onRegenerate }: { token: string; onRegenerate: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) return;
    loadQrLib().then((QRCode) => {
      if (QRCode && canvasRef.current) QRCode.toCanvas(canvasRef.current, token, { width: 180, margin: 1 }, () => {});
    });
  }, [token]);

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-center">
      <div className="bg-white p-2 rounded-xl shrink-0">
        {token ? (
          <canvas ref={canvasRef} width={180} height={180} />
        ) : (
          <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400 text-xs text-center">ยังไม่มีรหัส QR<br />กดสร้างรหัส</div>
        )}
      </div>
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-white font-bold text-sm flex items-center gap-2"><QrCode size={16} className="text-brandPurple" /> QR Code สำหรับลงเวลา</p>
          <p className="text-textMuted text-xs mt-1 leading-relaxed">พิมพ์ QR นี้ติดที่ออฟฟิศ พนักงานสแกนเพื่อยืนยันการลงเวลา หากต้องการยกเลิกรหัสเดิม ให้สร้างรหัสใหม่</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-textMuted text-xs font-mono break-all">{token || "—"}</div>
        <button type="button" onClick={onRegenerate} className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg font-semibold">
          <RefreshCw size={14} /> สร้างรหัส QR ใหม่
        </button>
      </div>
    </div>
  );
}
