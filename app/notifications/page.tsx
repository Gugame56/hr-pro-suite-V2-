"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Info, AlertTriangle } from "lucide-react";
import { notificationsFor, type AppNotification } from "@/lib/notifications";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // โหลดแจ้งเตือนเฉพาะที่เกี่ยวกับ role ของผู้ใช้ (พนักงานเห็นแค่ของตัวเอง)
  useEffect(() => {
    const session = localStorage.getItem("hr_session");
    const role = session ? JSON.parse(session).role : undefined;
    setNotifications(notificationsFor(role));
  }, []);

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: number) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="text-brandGreen" size={20} />;
      case "warning": return <AlertTriangle className="text-brandOrange" size={20} />;
      case "info": return <Info className="text-brandPurple" size={20} />;
      default: return <Bell className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">การแจ้งเตือน (Notifications)</h2>
          <p className="text-textMuted text-sm">ติดตามความเคลื่อนไหวและสถานะคำขอของคุณ</p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="text-sm text-brandPurple hover:underline font-semibold disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
        >
          ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
        </button>
      </div>

      <div className="bg-cardDark border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        {notifications.map((notif) => (
          <button
            key={notif.id}
            onClick={() => markRead(notif.id)}
            className={`w-full flex gap-4 p-6 border-b border-gray-800 last:border-0 hover:bg-gray-800/20 transition-all text-left group ${notif.read ? "opacity-60" : ""}`}
          >
            <div className="shrink-0 mt-1">
              {getIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1 gap-3">
                <h3 className="text-sm font-bold text-white group-hover:text-brandPurple transition-colors flex items-center gap-2">
                  {!notif.read && <span className="h-2 w-2 rounded-full bg-brandPurple shrink-0" />}
                  {notif.title}
                </h3>
                <span className="text-[10px] text-textMuted flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {notif.time}
                </span>
              </div>
              <p className="text-xs text-textMuted leading-relaxed">{notif.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
