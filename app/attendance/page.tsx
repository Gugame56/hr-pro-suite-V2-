"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Clock, MapPin, AlertCircle, Calendar, Loader2, QrCode, Navigation, X, CheckCircle2,
  List, CalendarDays, ChevronLeft, ChevronRight, UserCheck, Timer, Home, Plane,
} from "lucide-react";
import { haversineMeters } from "@/lib/geo";

type VerifyMethod = "gps" | "qr";
type LogView = "list" | "calendar";
type CalMode = "month" | "week";

export default function AttendancePage() {
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState<"idle" | "checked-in" | "checked-out">("idle");
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [attendanceLog, setAttendanceLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Office config (from Settings)
  const [config, setConfig] = useState({
    gpsEnabled: false,
    qrEnabled: false,
    lat: NaN,
    lng: NaN,
    radius: 200,
  });
  const [method, setMethod] = useState<VerifyMethod>("gps");

  // GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // QR state
  const [qrToken, setQrToken] = useState<string>("");
  const [scanning, setScanning] = useState(false);

  // Log view state
  const [logView, setLogView] = useState<LogView>("list");
  const [calMode, setCalMode] = useState<CalMode>("month");
  const [cursor, setCursor] = useState(new Date()); // month/week being viewed

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchConfig();
    
    // Load session
    const session = localStorage.getItem("hr_session");
    if (session) {
      const parsed = JSON.parse(session);
      setUser(parsed);
      fetchLogs(parsed.employeeId || parsed.id);
    }

    return () => clearInterval(timer);
  }, []);

  const showNotification = (message: string, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      const gpsEnabled = data.attendance_verify_gps === "On";
      const qrEnabled = data.attendance_verify_qr === "On";
      setConfig({
        gpsEnabled,
        qrEnabled,
        lat: parseFloat(data.office_lat),
        lng: parseFloat(data.office_lng),
        radius: parseFloat(data.office_radius) || 200,
      });
      // Default the toggle to the first enabled method.
      if (gpsEnabled) setMethod("gps");
      else if (qrEnabled) setMethod("qr");
      // Pre-fetch location so the range badge is live on load.
      if (gpsEnabled) locate();
    } catch {
      /* settings are optional; fall back to free check-in */
    }
  };

  const fetchLogs = async (employeeId?: string) => {
    const targetId = employeeId || user?.employeeId || user?.id;
    if (!targetId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/attendance?employeeId=${targetId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Newest first.
        const sorted = [...data].reverse();
        setAttendanceLog(sorted);

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRecord = data.find((row: any) => row.date === todayStr);
        if (todayRecord) {
          if (todayRecord.checkOut) {
            setStatus("checked-out");
          } else {
            setStatus("checked-in");
            setCheckInTime(todayRecord.checkIn);
          }
        }
      }
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- GPS ----
  const locate = () => {
    if (!navigator.geolocation) {
      setGpsError("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setGpsError(err.code === err.PERMISSION_DENIED ? "กรุณาอนุญาตการเข้าถึงตำแหน่ง" : "ไม่สามารถระบุตำแหน่งได้");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const distance =
    coords && !Number.isNaN(config.lat) && !Number.isNaN(config.lng)
      ? haversineMeters(coords.lat, coords.lng, config.lat, config.lng)
      : null;
  const inRange = distance != null ? distance <= config.radius : null;

  // ---- Submit ----
  const submit = async (action: "check-in" | "check-out") => {
    const anyMethod = config.gpsEnabled || config.qrEnabled;
    const employeeId = user?.employeeId || user?.id;

    if (!employeeId) {
      showNotification("ไม่พบข้อมูลพนักงาน กรุณาเข้าสู่ระบบใหม่", "error");
      return;
    }

    // Client-side guards for a friendlier UX; the API enforces this too.
    if (anyMethod) {
      if (method === "gps") {
        if (!coords) {
          showNotification("กรุณากดระบุตำแหน่งก่อนลงเวลา", "error");
          return;
        }
        if (inRange === false) {
          showNotification("คุณอยู่นอกพื้นที่ออฟฟิศ ไม่สามารถลงเวลาได้", "error");
          return;
        }
      }
      if (method === "qr" && !qrToken) {
        showNotification("กรุณาสแกน QR ของออฟฟิศก่อนลงเวลา", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          employeeId: employeeId,
          method: anyMethod ? method : undefined,
          lat: method === "gps" ? coords?.lat : undefined,
          lng: method === "gps" ? coords?.lng : undefined,
          qrToken: method === "qr" ? qrToken : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ทำรายการไม่สำเร็จ");

      if (action === "check-in") {
        setStatus("checked-in");
        setCheckInTime(data.time);
        showNotification("ลงชื่อเข้างานสำเร็จ");
      } else {
        setStatus("checked-out");
        showNotification("ลงชื่อออกงานสำเร็จ");
      }
      setQrToken("");
      await fetchLogs();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Manual self check-in (works when no GPS/QR verification is enforced).
  const manualCheckIn = async () => {
    const employeeId = user?.employeeId || user?.id;
    if (!employeeId) {
      showNotification("ไม่พบข้อมูลพนักงาน กรุณาเข้าสู่ระบบใหม่", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-in", employeeId: employeeId, method: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
      setStatus("checked-in");
      setCheckInTime(data.time);
      showNotification("เช็คชื่อด้วยตัวเองสำเร็จ");
      await fetchLogs();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const availableMethods: VerifyMethod[] = [
    ...(config.gpsEnabled ? (["gps"] as VerifyMethod[]) : []),
    ...(config.qrEnabled ? (["qr"] as VerifyMethod[]) : []),
  ];

  // Summary counts derived from the loaded log.
  const summary = useMemo(() => {
    const norm = (s?: string) => (s || "").toLowerCase();
    return {
      present: attendanceLog.filter((l) => l.checkIn).length,
      late: attendanceLog.filter((l) => norm(l.status).includes("late") || norm(l.status).includes("สาย")).length,
      wfh: attendanceLog.filter((l) => norm(l.status).includes("wfh") || norm(l.method) === "wfh").length,
      leave: attendanceLog.filter((l) => norm(l.status).includes("leave") || norm(l.status).includes("ลา")).length,
    };
  }, [attendanceLog]);

  // Map date(YYYY-MM-DD) -> log, for the calendar view.
  const logByDate = useMemo(() => {
    const m: Record<string, any> = {};
    attendanceLog.forEach((l) => { if (l.date) m[l.date] = l; });
    return m;
  }, [attendanceLog]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
            notification.type === "error" ? "bg-red-500" : "bg-brandGreen"
          }`}
        >
          {notification.message}
        </div>
      )}

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onResult={(value) => {
            setQrToken(value);
            setScanning(false);
            showNotification("อ่าน QR สำเร็จ พร้อมลงเวลา");
          }}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">การเข้างาน (Attendance)</h2>
          <p className="text-textMuted text-sm">บันทึกเวลาและตรวจสอบประวัติการเข้างาน</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat icon={<UserCheck size={20} />} label="มาทำงาน" value={summary.present} color="brandGreen" />
        <SummaryStat icon={<Timer size={20} />} label="มาสาย" value={summary.late} color="brandOrange" />
        <SummaryStat icon={<Home size={20} />} label="WFH" value={summary.wfh} color="brandBlue" />
        <SummaryStat icon={<Plane size={20} />} label="ลา" value={summary.leave} color="brandPurple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock & Action Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-cardDark border border-gray-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-brandPurple/50"></div>
            <p className="text-textMuted text-sm font-medium mb-2 uppercase tracking-widest">
              {time.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h3 className="text-5xl font-black text-white mb-6 font-mono tracking-tighter">
              {time.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </h3>

            {/* Verification method toggle */}
            {availableMethods.length > 0 && (
              <div className="w-full mb-5">
                <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest mb-2 text-left">
                  วิธียืนยันการลงเวลา
                </p>
                <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                  {(["gps", "qr"] as VerifyMethod[]).map((m) => {
                    const enabled = m === "gps" ? config.gpsEnabled : config.qrEnabled;
                    if (!enabled) return null;
                    const active = method === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                          active ? "bg-brandPurple text-white shadow" : "text-textMuted hover:text-white"
                        } ${availableMethods.length === 1 ? "col-span-2" : ""}`}
                      >
                        {m === "gps" ? <Navigation size={14} /> : <QrCode size={14} />}
                        {m === "gps" ? "GPS" : "QR Code"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verification status indicator */}
            {availableMethods.length === 0 ? (
              <div className="flex items-center gap-2 text-textMuted bg-gray-800/40 px-4 py-1.5 rounded-full text-xs font-bold mb-8">
                <MapPin size={14} />
                ลงเวลาแบบอิสระ (ไม่ต้องยืนยัน)
              </div>
            ) : method === "gps" ? (
              <div className="w-full mb-6 space-y-2">
                {locating ? (
                  <div className="flex items-center justify-center gap-2 text-textMuted bg-gray-800/40 px-4 py-2 rounded-full text-xs font-bold">
                    <Loader2 size={14} className="animate-spin" /> กำลังระบุตำแหน่ง...
                  </div>
                ) : gpsError ? (
                  <div className="flex items-center justify-center gap-2 text-brandRed bg-brandRed/10 px-4 py-2 rounded-full text-xs font-bold">
                    <AlertCircle size={14} /> {gpsError}
                  </div>
                ) : inRange === true ? (
                  <div className="flex items-center justify-center gap-2 text-brandGreen bg-brandGreen/10 px-4 py-2 rounded-full text-xs font-bold">
                    <CheckCircle2 size={14} /> อยู่ในพื้นที่ออฟฟิศ ({Math.round(distance!)} ม.)
                  </div>
                ) : inRange === false ? (
                  <div className="flex items-center justify-center gap-2 text-brandRed bg-brandRed/10 px-4 py-2 rounded-full text-xs font-bold">
                    <AlertCircle size={14} /> นอกพื้นที่ (ห่าง {Math.round(distance!)} ม. / {config.radius} ม.)
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-textMuted bg-gray-800/40 px-4 py-2 rounded-full text-xs font-bold">
                    <MapPin size={14} /> ยังไม่ได้ระบุตำแหน่ง
                  </div>
                )}
                <button
                  onClick={locate}
                  className="w-full text-xs text-brandPurple hover:underline font-semibold flex items-center justify-center gap-1"
                >
                  <Navigation size={12} /> ระบุตำแหน่งอีกครั้ง
                </button>
              </div>
            ) : (
              <div className="w-full mb-6 space-y-2">
                {qrToken ? (
                  <div className="flex items-center justify-center gap-2 text-brandGreen bg-brandGreen/10 px-4 py-2 rounded-full text-xs font-bold">
                    <CheckCircle2 size={14} /> สแกน QR แล้ว พร้อมลงเวลา
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-textMuted bg-gray-800/40 px-4 py-2 rounded-full text-xs font-bold">
                    <QrCode size={14} /> ยังไม่ได้สแกน QR
                  </div>
                )}
                <button
                  onClick={() => setScanning(true)}
                  className="w-full text-xs text-brandPurple hover:underline font-semibold flex items-center justify-center gap-1"
                >
                  <QrCode size={12} /> {qrToken ? "สแกนใหม่" : "เปิดกล้องสแกน QR"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 w-full gap-4">
              {status !== "checked-in" && status !== "checked-out" ? (
                <button
                  onClick={() => submit("check-in")}
                  disabled={submitting}
                  className="w-full bg-brandPurple hover:bg-purple-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brandPurple/20 flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <Clock className="group-hover:rotate-12 transition-transform" size={20} />}
                  Check In (ลงชื่อเข้างาน)
                </button>
              ) : status === "checked-in" ? (
                <button
                  onClick={() => submit("check-out")}
                  disabled={submitting}
                  className="w-full bg-brandRed/20 hover:bg-brandRed text-brandRed hover:text-white border border-brandRed/50 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : <Clock className="group-hover:rotate-12 transition-transform" size={20} />}
                  Check Out (ลงชื่อออกงาน)
                </button>
              ) : (
                <div className="w-full bg-gray-800/50 text-gray-400 py-4 rounded-2xl text-center font-bold text-sm border border-gray-700">
                  ลงชื่อออกงานเรียบร้อยแล้วสำหรับวันนี้
                </div>
              )}
            </div>

            {/* Manual self check-in */}
            {status !== "checked-in" && status !== "checked-out" && (
              <button
                onClick={manualCheckIn}
                disabled={submitting}
                className="mt-3 w-full text-xs font-semibold text-textMuted hover:text-white border border-gray-800 hover:border-brandPurple/50 rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserCheck size={14} /> เช็คชื่อด้วยตัวเอง (Manual)
              </button>
            )}

            {checkInTime && (
              <p className="mt-6 text-sm text-textMuted">
                ลงชื่อเข้างานวันนี้เวลา <span className="text-white font-bold">{checkInTime}</span>
              </p>
            )}
          </div>

          <div className="bg-brandOrange/10 border border-brandOrange/30 p-5 rounded-2xl flex gap-4">
            <div className="p-3 bg-brandOrange/20 text-brandOrange rounded-xl h-fit">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-brandOrange font-bold text-sm">แจ้งเตือน</h4>
              <p className="text-xs text-brandOrange/80 mt-1 leading-relaxed">
                กรุณาบันทึกเวลาเข้า-ออกงานให้ถูกต้อง เพื่อความถูกต้องในการคำนวณเงินเดือน
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Log */}
        <div className="lg:col-span-2">
          <div className="bg-cardDark border border-gray-800 rounded-3xl overflow-hidden shadow-xl h-full flex flex-col">
            <div className="p-6 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3 bg-gray-800/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="text-brandPurple" size={20} />
                บันทึกการเข้างาน
              </h3>
              <div className="flex items-center gap-3">
                {/* List / Calendar toggle */}
                <div className="flex bg-gray-900/50 border border-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setLogView("list")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${logView === "list" ? "bg-brandPurple text-white" : "text-textMuted hover:text-white"}`}
                  >
                    <List size={13} /> รายการ
                  </button>
                  <button
                    onClick={() => setLogView("calendar")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${logView === "calendar" ? "bg-brandPurple text-white" : "text-textMuted hover:text-white"}`}
                  >
                    <CalendarDays size={13} /> ปฏิทิน
                  </button>
                </div>
                <button onClick={() => fetchLogs()} className="text-xs text-brandPurple hover:underline font-semibold">รีเฟรช</button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="p-20 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
                  <p className="text-textMuted">กำลังโหลดข้อมูล...</p>
                </div>
              ) : logView === "calendar" ? (
                <AttendanceCalendar
                  cursor={cursor}
                  setCursor={setCursor}
                  mode={calMode}
                  setMode={setCalMode}
                  logByDate={logByDate}
                />
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-800/30 text-textMuted text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-8 py-4">วันที่</th>
                      <th className="px-8 py-4">เข้างาน</th>
                      <th className="px-8 py-4">ออกงาน</th>
                      <th className="px-8 py-4">สถานะ</th>
                      <th className="px-8 py-4">ชั่วโมงงาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {attendanceLog.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-textMuted italic">
                          ไม่มีข้อมูลการเข้างาน
                        </td>
                      </tr>
                    ) : (
                      attendanceLog.map((log, i) => (
                        <tr key={i} className="hover:bg-gray-800/20 transition-colors group">
                          <td className="px-8 py-5 text-white font-medium">{log.date}</td>
                          <td className="px-8 py-5 text-textMuted">{log.checkIn}</td>
                          <td className="px-8 py-5 text-textMuted">{log.checkOut || "-"}</td>
                          <td className="px-8 py-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                log.status === "On Time" ? "bg-brandGreen/10 text-brandGreen" : "bg-brandRed/10 text-brandRed"
                              }`}
                            >
                              {log.status?.toUpperCase() || "UNKNOWN"}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-textMuted font-mono">{log.hours || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAT_ACCENT: Record<string, { bg: string; text: string }> = {
  brandGreen: { bg: "bg-brandGreen/10", text: "text-brandGreen" },
  brandOrange: { bg: "bg-brandOrange/10", text: "text-brandOrange" },
  brandBlue: { bg: "bg-brandBlue/10", text: "text-brandBlue" },
  brandPurple: { bg: "bg-brandPurple/10", text: "text-brandPurple" },
};

function SummaryStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const a = STAT_ACCENT[color] ?? STAT_ACCENT.brandPurple;
  return (
    <div className="bg-cardDark border border-gray-800 p-4 rounded-2xl flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${a.bg} ${a.text}`}>{icon}</div>
      <div>
        <p className="text-textMuted text-xs font-semibold uppercase">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function isoOf(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

/** Month/Week calendar that highlights days with attendance. */
function AttendanceCalendar({
  cursor, setCursor, mode, setMode, logByDate,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  mode: CalMode;
  setMode: (m: CalMode) => void;
  logByDate: Record<string, any>;
}) {
  const todayIso = isoOf(new Date());

  // Build the list of days to render.
  const days: (Date | null)[] = [];
  if (mode === "month") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = first.getDay();
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  } else {
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - cursor.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
  }

  const shift = (dir: number) => {
    const d = new Date(cursor);
    if (mode === "month") d.setMonth(cursor.getMonth() + dir);
    else d.setDate(cursor.getDate() + dir * 7);
    setCursor(d);
  };

  const title =
    mode === "month"
      ? `${TH_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`
      : (() => {
          const s = new Date(cursor); s.setDate(cursor.getDate() - cursor.getDay());
          const e = new Date(s); e.setDate(s.getDate() + 6);
          return `${s.getDate()} ${TH_MONTHS[s.getMonth()].slice(0, 3)} - ${e.getDate()} ${TH_MONTHS[e.getMonth()].slice(0, 3)}`;
        })();

  const statusColor = (log: any) => {
    const s = (log?.status || "").toLowerCase();
    if (!log?.checkIn) return "bg-gray-700/40 text-gray-400";
    if (s.includes("late") || s.includes("สาย")) return "bg-brandOrange/20 text-brandOrange border border-brandOrange/40";
    return "bg-brandGreen/20 text-brandGreen border border-brandGreen/40";
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-gray-800 text-textMuted hover:text-white"><ChevronLeft size={18} /></button>
          <span className="text-white font-bold text-sm min-w-[160px] text-center">{title}</span>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-gray-800 text-textMuted hover:text-white"><ChevronRight size={18} /></button>
          <button onClick={() => setCursor(new Date())} className="ml-1 text-xs text-brandPurple hover:underline">วันนี้</button>
        </div>
        <div className="flex bg-gray-900/50 border border-gray-800 rounded-lg p-1">
          <button onClick={() => setMode("month")} className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${mode === "month" ? "bg-brandPurple text-white" : "text-textMuted hover:text-white"}`}>เดือน</button>
          <button onClick={() => setMode("week")} className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${mode === "week" ? "bg-brandPurple text-white" : "text-textMuted hover:text-white"}`}>สัปดาห์</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {TH_DOW.map((d) => <div key={d} className="text-center text-[10px] font-bold text-textMuted uppercase py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = isoOf(d);
          const log = logByDate[iso];
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              title={log ? `${iso} • เข้า ${log.checkIn || "-"} / ออก ${log.checkOut || "-"}` : iso}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${mode === "week" ? "min-h-20" : ""} ${
                log ? statusColor(log) : "bg-gray-900/30 text-gray-500"
              } ${isToday ? "ring-2 ring-brandPurple" : ""}`}
            >
              <span className="font-bold">{d.getDate()}</span>
              {log?.checkIn && <span className="text-[9px] font-mono mt-0.5">{log.checkIn.slice(0, 5)}</span>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[10px] text-textMuted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-brandGreen/40" /> ตรงเวลา</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-brandOrange/40" /> มาสาย</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded ring-2 ring-brandPurple" /> วันนี้</span>
      </div>
    </div>
  );
}

/**
 * Camera QR scanner. Uses the native BarcodeDetector API when available
 * (Chrome/Edge/Android) and falls back to manual code entry otherwise.
 */
function QrScanner({ onClose, onResult }: { onClose: () => void; onResult: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) {
        setSupported(false);
        return;
      }
      try {
        const detector = new Detector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              onResult(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready; keep polling */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง");
      }
    };

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-cardDark border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b border-gray-800">
          <h3 className="text-white font-bold flex items-center gap-2">
            <QrCode size={18} className="text-brandPurple" /> สแกน QR ออฟฟิศ
          </h3>
          <button onClick={onClose} className="text-textMuted hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {supported && !error ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-8 border-2 border-brandPurple/70 rounded-2xl pointer-events-none" />
            </div>
          ) : (
            <div className="text-center text-textMuted text-sm bg-gray-900/50 rounded-2xl p-6">
              {error || "เบราว์เซอร์นี้ไม่รองรับการสแกนด้วยกล้อง กรุณากรอกรหัสจาก QR ด้วยตนเอง"}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-textMuted text-xs font-semibold uppercase">กรอกรหัสด้วยตนเอง</label>
            <div className="flex gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="วางรหัสจาก QR ที่นี่"
                className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brandPurple"
              />
              <button
                onClick={() => manual.trim() && onResult(manual.trim())}
                className="bg-brandPurple hover:bg-purple-600 text-white px-4 rounded-lg text-sm font-bold"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
