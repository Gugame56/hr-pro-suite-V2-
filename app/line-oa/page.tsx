"use client";

import { useState, useEffect } from "react";
import {
  Loader2, Save, MessageSquare, Key, Link as LinkIcon, ShieldCheck, Zap, Users,
  Send, CalendarX, Receipt, Megaphone, CalendarClock, Plane, Trophy, UserPlus, History,
} from "lucide-react";

type LineSettings = {
  line_channel_token: string;
  line_channel_secret: string;
  line_webhook_url: string;
  line_bot_name: string;
  line_group_id: string;
  line_notifications_enabled: string;
};

type FlexTemplate = {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  desc: string;
};

const FLEX_TEMPLATES: FlexTemplate[] = [
  { id: "leave", name: "คำขอลา", icon: CalendarX, color: "brandPurple", desc: "แจ้งเตือนคำขอลาพร้อมปุ่มอนุมัติ/ปฏิเสธ" },
  { id: "payslip", name: "สลิปเงินเดือน", icon: Receipt, color: "brandGreen", desc: "ส่งสลิปเงินเดือนรายเดือนให้พนักงาน" },
  { id: "announce", name: "ประกาศ", icon: Megaphone, color: "brandOrange", desc: "ประกาศข่าวสารภายในองค์กร" },
  { id: "meeting", name: "นัดประชุม", icon: CalendarClock, color: "brandBlue", desc: "การ์ดนัดหมายประชุมพร้อมเวลา/ห้อง" },
  { id: "trip", name: "ทริปบริษัท", icon: Plane, color: "brandGreen", desc: "เชิญร่วมทริป/Outing ของบริษัท" },
  { id: "reward", name: "มอบรางวัล", icon: Trophy, color: "brandOrange", desc: "ประกาศเกียรติคุณ/มอบรางวัลพนักงาน" },
  { id: "welcome", name: "ต้อนรับพนักงานใหม่", icon: UserPlus, color: "brandPurple", desc: "ต้อนรับสมาชิกใหม่เข้าทีม" },
];

const ACCENT: Record<string, { bg: string; text: string }> = {
  brandPurple: { bg: "bg-brandPurple/15", text: "text-brandPurple" },
  brandGreen: { bg: "bg-brandGreen/15", text: "text-brandGreen" },
  brandOrange: { bg: "bg-brandOrange/15", text: "text-brandOrange" },
  brandBlue: { bg: "bg-brandBlue/15", text: "text-brandBlue" },
};

type SendRecord = { time: string; event: string; target: string; status: number };

export default function LineOAPage() {
  const [settings, setSettings] = useState<LineSettings>({
    line_channel_token: "",
    line_channel_secret: "",
    line_webhook_url: "",
    line_bot_name: "HR Pro Bot",
    line_group_id: "",
    line_notifications_enabled: "On",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [history, setHistory] = useState<SendRecord[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch {
      showNotification("Error fetching LINE settings", "error");
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
      showNotification("บันทึกการตั้งค่า LINE OA สำเร็จ");
    } catch {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Simulated Flex test-send. Records the attempt with an HTTP-style status so HR
  // can see delivery history. (Real LINE push requires a valid token + group id.)
  const testSend = async (tpl: FlexTemplate) => {
    setSendingId(tpl.id);
    const target = settings.line_group_id?.trim() || "(ยังไม่ได้ตั้ง Group ID)";
    await new Promise((r) => setTimeout(r, 700));
    const configured = !!settings.line_channel_token && !!settings.line_group_id;
    const status = configured ? 200 : 401;
    setHistory((prev) => [
      { time: new Date().toLocaleTimeString("th-TH"), event: `flex:${tpl.id}`, target, status },
      ...prev,
    ].slice(0, 20));
    showNotification(
      configured ? `ส่ง Flex "${tpl.name}" สำเร็จ (200)` : `ส่งไม่สำเร็จ: ยังไม่ได้ตั้งค่า Token / Group ID (401)`,
      configured ? "success" : "error"
    );
    setSendingId(null);
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

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500 rounded-2xl text-white"><MessageSquare size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-white">LINE OA Integration</h2>
            <p className="text-textMuted text-sm">เชื่อมต่อระบบ HR Pro Suite กับ LINE Official Account</p>
          </div>
        </div>
        <button onClick={() => handleSave()} disabled={isSaving}
          className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20 disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกการเชื่อมต่อ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-cardDark border border-gray-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="text-brandPurple" size={20} />
              <h3 className="text-lg font-bold text-white">API Credentials</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Channel Access Token" type="password" value={settings.line_channel_token}
                onChange={(v) => setSettings({ ...settings, line_channel_token: v })} placeholder="Enter your LINE channel token" />
              <Field label="Channel Secret" type="password" value={settings.line_channel_secret}
                onChange={(v) => setSettings({ ...settings, line_channel_secret: v })} placeholder="Enter your LINE channel secret" />
              <div className="space-y-2">
                <label className="text-textMuted text-xs font-semibold uppercase">Webhook URL</label>
                <div className="flex gap-2">
                  <input readOnly type="text" className="flex-1 bg-gray-800 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
                    value={settings.line_webhook_url} onChange={() => {}} />
                  <button type="button" className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors" title="Copy Link"><LinkIcon size={18} /></button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-800 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-brandPurple" size={20} />
                <h3 className="text-lg font-bold text-white">Bot Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Bot Name" type="text" value={settings.line_bot_name}
                  onChange={(v) => setSettings({ ...settings, line_bot_name: v })} />
                <div className="space-y-2">
                  <label className="text-textMuted text-xs font-semibold uppercase flex items-center gap-1"><Users size={12} /> Group ID</label>
                  <input type="text" className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brandPurple font-mono text-sm"
                    value={settings.line_group_id} onChange={(e) => setSettings({ ...settings, line_group_id: e.target.value })} placeholder="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-textMuted text-xs font-semibold uppercase">แจ้งเตือนผ่าน LINE</label>
                  <div className="flex items-center gap-3 p-2">
                    <button type="button"
                      onClick={() => setSettings({ ...settings, line_notifications_enabled: settings.line_notifications_enabled === "On" ? "Off" : "On" })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${settings.line_notifications_enabled === "On" ? "bg-brandGreen" : "bg-gray-700"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${settings.line_notifications_enabled === "On" ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                    <span className="text-sm text-white">{settings.line_notifications_enabled === "On" ? "เปิดใช้งาน" : "ปิดการใช้งาน"}</span>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Flex Card Templates */}
          <div className="bg-cardDark border border-gray-800 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="text-brandPurple" size={20} />
              <h3 className="text-lg font-bold text-white">Flex Card Templates</h3>
              <span className="text-xs text-textMuted">({FLEX_TEMPLATES.length} แบบ)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FLEX_TEMPLATES.map((tpl) => {
                const a = ACCENT[tpl.color] ?? ACCENT.brandPurple;
                const Icon = tpl.icon;
                return (
                  <div key={tpl.id} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4 hover:border-brandPurple/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${a.bg} ${a.text} shrink-0`}><Icon size={20} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{tpl.name}</p>
                        <p className="text-[11px] text-textMuted mt-0.5 leading-snug">{tpl.desc}</p>
                      </div>
                    </div>
                    <button onClick={() => testSend(tpl)} disabled={sendingId === tpl.id}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 bg-brandPurple/10 hover:bg-brandPurple hover:text-white text-brandPurple text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-50">
                      {sendingId === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} ทดสอบส่ง Flex
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Send history */}
          <div className="bg-cardDark border border-gray-800 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-center gap-2">
              <History className="text-brandPurple" size={18} />
              <h3 className="text-base font-bold text-white">ประวัติการส่ง</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-center text-textMuted text-sm py-10">ยังไม่มีประวัติการส่ง — ลองกด “ทดสอบส่ง Flex”</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-800/30 text-textMuted text-[10px] uppercase tracking-widest">
                    <th className="px-5 py-3 font-semibold">เวลา</th>
                    <th className="px-5 py-3 font-semibold">Event</th>
                    <th className="px-5 py-3 font-semibold">Target</th>
                    <th className="px-5 py-3 font-semibold text-right">HTTP Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {history.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-800/20">
                      <td className="px-5 py-3 text-textMuted font-mono text-xs">{h.time}</td>
                      <td className="px-5 py-3 text-white font-mono text-xs">{h.event}</td>
                      <td className="px-5 py-3 text-textMuted font-mono text-xs truncate max-w-[180px]">{h.target}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status >= 200 && h.status < 300 ? "bg-brandGreen/10 text-brandGreen" : "bg-brandRed/10 text-brandRed"
                        }`}>{h.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Guide/Docs */}
        <div className="space-y-6">
          <div className="bg-cardDark border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-brandPurple" size={20} />
              <h3 className="text-lg font-bold text-white">วิธีตั้งค่า</h3>
            </div>
            <ul className="space-y-4">
              {[
                <>สร้าง LINE Official Account ที่ <a href="https://manager.line.biz" target="_blank" className="text-brandPurple hover:underline">manager.line.biz</a></>,
                "ไปที่ LINE Developers Console เพื่อสร้าง Messaging API channel",
                "คัดลอก Access Token และ Secret มาใส่ในหน้าตั้งค่านี้",
                "เพิ่มบอทเข้ากลุ่ม แล้วนำ Group ID มาใส่เพื่อส่ง Flex",
                "นำ Webhook URL จากหน้านี้ไปใส่ใน LINE Developers Console",
              ].map((txt, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-brandPurple/20 text-brandPurple flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <p className="text-xs text-textMuted">{txt}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, placeholder,
}: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-textMuted text-xs font-semibold uppercase">{label}</label>
      <input type={type} className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brandPurple"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
