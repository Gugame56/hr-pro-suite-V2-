"use client";

import { useState, useEffect } from "react";
import { Mail, Briefcase, Phone, ShieldCheck, BadgeCheck, Building2, Wallet, Loader2 } from "lucide-react";

export default function MyInfoPage() {
  const [user, setUser] = useState<any>(null);
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("hr_session");
    if (!session) { setLoading(false); return; }
    const parsed = JSON.parse(session);
    setUser(parsed);

    // Pull the real employee record so this page reflects the signed-in person
    // instead of the old hardcoded placeholders.
    fetch("/api/employees")
      .then((r) => r.json())
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return;
        const mine = rows.find(
          (e) =>
            e.id?.toString() === (parsed.employeeId || "").toString() ||
            (e.email || "").toLowerCase() === (parsed.email || "").toLowerCase()
        );
        if (mine) setEmp(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-textMuted gap-2">
        <Loader2 className="animate-spin" size={20} /> กำลังโหลดข้อมูล...
      </div>
    );
  }
  if (!user) return null;

  // Prefer the real employee record, fall back to the session for the demo accounts.
  const name = emp?.name || user.name;
  const position = emp?.position || user.position || "-";
  const department = emp?.department || "-";
  const email = emp?.email || user.email || "-";
  const empId = emp?.id || user.employeeId || "-";
  const status = emp?.status || "Active";
  const salary = emp?.salary;
  const nickname = emp?.nickname;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">ข้อมูลของฉัน (My Info)</h2>
        <p className="text-textMuted text-sm">ตรวจสอบข้อมูลส่วนตัวและรายละเอียดการจ้างงานของคุณ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-brandPurple flex items-center justify-center text-3xl font-bold shadow-2xl shadow-brandPurple/20 mb-4">
            {(name || "U").slice(0, 2)}
          </div>
          <h3 className="text-xl font-bold text-white">
            {name} {nickname && <span className="text-textMuted font-normal">({nickname})</span>}
          </h3>
          <p className="text-brandPurple font-medium">{position}</p>
          <span
            className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
              status === "Active" || status === "active"
                ? "bg-brandGreen/15 text-brandGreen"
                : "bg-gray-700/40 text-gray-400"
            }`}
          >
            <BadgeCheck size={13} /> {status === "Active" || status === "active" ? "พนักงานปัจจุบัน" : status}
          </span>
          <div className="mt-6 w-full space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm text-textMuted bg-bgDark/50 p-3 rounded-xl border border-gray-800">
              <Mail size={16} className="text-brandPurple shrink-0" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-textMuted bg-bgDark/50 p-3 rounded-xl border border-gray-800">
              <Building2 size={16} className="text-brandPurple shrink-0" />
              <span>แผนก{department}</span>
            </div>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-brandPurple" />
              รายละเอียดการทำงาน
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCell label="รหัสพนักงาน" value={empId} />
              <InfoCell label="แผนก" value={department} />
              <InfoCell label="ตำแหน่ง" value={position} />
              <InfoCell label="สถานะการจ้างงาน" value={status === "Active" || status === "active" ? "พนักงานประจำ (Active)" : status} />
            </div>
          </div>

          {salary !== undefined && salary !== "" && (
            <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-brandPurple" />
                ค่าตอบแทน
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCell
                  label="เงินเดือนพื้นฐาน"
                  value={`฿ ${Number(salary).toLocaleString("th-TH")}`}
                />
                <InfoCell label="รอบการจ่าย" value="ทุกสิ้นเดือน" />
              </div>
            </div>
          )}

          <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-brandPurple" />
              การติดต่อ & ข้อมูลเพิ่มเติม
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCell label="อีเมล" value={email} icon={<Mail size={14} />} />
              <InfoCell label="ระดับสิทธิ์การใช้งาน" value={user.role === "manager" ? "ผู้จัดการ" : user.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"} />
            </div>
            <p className="text-xs text-textMuted mt-4">
              หากข้อมูลไม่ถูกต้อง กรุณาติดต่อฝ่ายทรัพยากรบุคคลเพื่อแก้ไข
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="p-4 bg-bgDark/50 rounded-xl border border-gray-800">
      <p className="text-xs text-textMuted uppercase font-bold mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-white break-words">{value || "-"}</p>
    </div>
  );
}
