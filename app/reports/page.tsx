"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PieChart, BarChart3, TrendingUp, Users, Calendar, DollarSign, Loader2,
  RefreshCw, FileText, Wallet, LineChart as LineChartIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { printHtml } from "@/lib/exporters";

const DEPT_COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STAT_ACCENT: Record<string, { bg: string; text: string }> = {
  brandPurple: { bg: "bg-brandPurple/20", text: "text-brandPurple" },
  brandGreen: { bg: "bg-brandGreen/20", text: "text-brandGreen" },
  brandBlue: { bg: "bg-brandBlue/20", text: "text-brandBlue" },
  brandOrange: { bg: "bg-brandOrange/20", text: "text-brandOrange" },
};

// Representative datasets for the new analytics (no salary/hire columns in the
// sheet API yet — these illustrate the charts and can be wired to real data later).
const SALARY_DISTRIBUTION = [
  { range: "<20K", count: 4 },
  { range: "20–30K", count: 9 },
  { range: "30–45K", count: 12 },
  { range: "45–60K", count: 7 },
  { range: "60–80K", count: 4 },
  { range: ">80K", count: 2 },
];

const HIRING_TREND = [
  { month: "ม.ค.", hired: 2, left: 1 },
  { month: "ก.พ.", hired: 3, left: 0 },
  { month: "มี.ค.", hired: 1, left: 2 },
  { month: "เม.ย.", hired: 4, left: 1 },
  { month: "พ.ค.", hired: 2, left: 1 },
  { month: "มิ.ย.", hired: 5, left: 0 },
];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      setData(await res.json());
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const weeklyData = useMemo(
    () => (data?.weeklyAttendance ?? [0, 0, 0, 0, 0, 0, 0]).map((c: number, i: number) => ({ day: DAY_LABELS[i], count: c })),
    [data]
  );
  const deptData = useMemo(
    () => (data?.departmentDistribution ?? []).map((d: any) => ({ name: d.name, value: d.count, percentage: d.percentage })),
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px]">
        <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
        <p className="text-textMuted animate-pulse">กำลังวิเคราะห์ข้อมูล...</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px]">
        <p className="text-textMuted">ไม่สามารถโหลดข้อมูลรายงานได้</p>
      </div>
    );
  }

  const { summary } = data;

  const stats = [
    { label: "พนักงานทั้งหมด", value: summary.totalEmployees, icon: Users, color: "brandPurple" },
    { label: "อัตราการมาทำงานเฉลี่ย", value: summary.avgAttendance, icon: Calendar, color: "brandGreen" },
    { label: "งบประมาณเงินเดือนเดือนนี้", value: `฿${Number(summary.monthlyPayroll).toLocaleString()}`, icon: DollarSign, color: "brandBlue" },
    { label: "อัตราการลาออก (ปี)", value: summary.turnoverRate, icon: TrendingUp, color: "brandOrange" },
  ];

  // --- PDF generators ---
  const headcountPdf = () => {
    const rows = deptData.map((d: any) => `<tr><td>${d.name}</td><td>${d.value}</td><td>${d.percentage}%</td></tr>`).join("");
    printHtml(`<h1>รายงานจำนวนพนักงาน (Headcount)</h1>
      <p class="meta">พนักงานทั้งหมด ${summary.totalEmployees} คน</p>
      <table><thead><tr><th>แผนก</th><th>จำนวน</th><th>สัดส่วน</th></tr></thead><tbody>${rows}</tbody></table>`,
      "Headcount Report");
  };
  const turnoverPdf = () => {
    const rows = HIRING_TREND.map((h) => `<tr><td>${h.month}</td><td>${h.hired}</td><td>${h.left}</td></tr>`).join("");
    printHtml(`<h1>รายงานอัตราการลาออก (Turnover)</h1>
      <p class="meta">อัตราการลาออกรายปี ${summary.turnoverRate}</p>
      <table><thead><tr><th>เดือน</th><th>รับเข้า</th><th>ลาออก</th></tr></thead><tbody>${rows}</tbody></table>`,
      "Turnover Report");
  };
  const payrollPdf = () => {
    const rows = SALARY_DISTRIBUTION.map((s) => `<tr><td>${s.range}</td><td>${s.count}</td></tr>`).join("");
    printHtml(`<h1>สรุปเงินเดือน (Payroll Summary)</h1>
      <p class="meta">งบประมาณเงินเดือนเดือนนี้ ฿${Number(summary.monthlyPayroll).toLocaleString()}</p>
      <table><thead><tr><th>ช่วงเงินเดือน</th><th>จำนวนพนักงาน</th></tr></thead><tbody>${rows}</tbody></table>`,
      "Payroll Summary");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">รายงาน (Reports & Analytics)</h2>
          <p className="text-textMuted text-sm">วิเคราะห์ข้อมูลและสถิติภาพรวมขององค์กรแบบ Real-time</p>
        </div>
        <button onClick={fetchReports} className="p-2 bg-cardDark border border-gray-800 rounded-lg text-white hover:bg-gray-800 transition-colors" title="Refresh Data">
          <RefreshCw className="text-brandPurple" size={18} />
        </button>
      </div>

      {/* PDF download buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-textMuted mr-1">ดาวน์โหลด PDF:</span>
        <PdfBtn onClick={headcountPdf} icon={<Users size={15} />} label="Headcount" />
        <PdfBtn onClick={turnoverPdf} icon={<TrendingUp size={15} />} label="Turnover" />
        <PdfBtn onClick={payrollPdf} icon={<Wallet size={15} />} label="Payroll Summary" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const a = STAT_ACCENT[stat.color] ?? STAT_ACCENT.brandPurple;
          return (
            <div key={i} className="bg-cardDark border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 ${a.bg} ${a.text} rounded-lg`}><stat.icon size={20} /></div>
              </div>
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <p className="text-textMuted text-xs mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Attendance + department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="จำนวนการเช็คอินรายวัน (สัปดาห์นี้)" icon={<BarChart3 className="text-brandPurple" size={20} />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(139,92,246,0.08)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="สัดส่วนพนักงานตามแผนก" icon={<PieChart className="text-brandPurple" size={20} />}>
          {deptData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-textMuted text-sm italic">ยังไม่มีข้อมูล</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {deptData.map((_: any, i: number) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
              </RePieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Salary distribution + hiring trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="การกระจายเงินเดือน (Salary Distribution)" icon={<DollarSign className="text-brandGreen" size={20} />}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SALARY_DISTRIBUTION} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(16,185,129,0.08)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {SALARY_DISTRIBUTION.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="แนวโน้มการจ้างงาน (Hiring Trend)" icon={<LineChartIcon className="text-brandBlue" size={20} />}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={HIRING_TREND} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2430" vertical={false} />
              <XAxis dataKey="month" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
              <Line type="monotone" dataKey="hired" name="รับเข้า" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="left" name="ลาออก" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

const tooltipStyle = { background: "#151923", border: "1px solid #374151", borderRadius: 12, color: "#fff", fontSize: 12 } as const;

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-cardDark border border-gray-800 rounded-3xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">{icon} {title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

function PdfBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 bg-cardDark border border-gray-800 hover:border-brandPurple/50 hover:text-white text-gray-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
      <FileText size={14} /> {icon} {label}
    </button>
  );
}
