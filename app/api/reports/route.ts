import { NextResponse } from 'next/server';
import { getRows } from '@/lib/sheetManager';
import { parseFlexibleDate } from '@/lib/dateUtils';
import { currentPeriod, num } from '@/lib/payrollSync';

export async function GET() {
  try {
    const [employees, attendance, payroll, resignations, leave, meetings] = await Promise.all([
      getRows('Employees'),
      getRows('Attendance'),
      getRows('Payroll'),
      getRows('Resignations'),
      getRows('LeaveRequests').catch(() => []),
      getRows('Meetings').catch(() => []),
    ]);

    const totalEmployees = employees.length;

    // 1. Avg Attendance Calculation
    // Assume attendance rows are check-ins.
    // Simplified: count check-ins for the last 30 days divided by (employees * 22 working days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = attendance.filter(a => {
      const date = parseFlexibleDate(a.date || a.timestamp);
      return date !== null && date >= thirtyDaysAgo;
    });

    const avgAttendance = totalEmployees > 0
      ? Math.round((recentAttendance.length / (totalEmployees * 22)) * 100)
      : 0;

    // 2. Monthly Payroll Sum — Payroll rows are keyed by Thai month name + year
    // (see lib/payrollSync.ts), not a paymentDate. Sum netPay for the current period.
    const { month: curMonth, year: curYear } = currentPeriod();
    const monthlyPayrollSum = payroll.reduce((acc, p) => {
      if (p.month === curMonth && (p.year || '').toString() === curYear) {
        return acc + num(p.netPay);
      }
      return acc;
    }, 0);

    // 3. Turnover Rate (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const yearlyResignations = resignations.filter(r => {
      const date = parseFlexibleDate(r.resignationDate);
      return date !== null && date >= oneYearAgo;
    }).length;

    const turnoverRate = totalEmployees > 0
      ? ((yearlyResignations / totalEmployees) * 100).toFixed(1)
      : "0.0";

    // 4. Department Distribution
    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      const dept = e.department || 'Unassigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const departmentDistribution = Object.entries(deptCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 5. Weekly Attendance
    const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    attendance.forEach(a => {
      const date = parseFlexibleDate(a.date || a.timestamp);
      if (date !== null && date >= startOfWeek) {
        weeklyData[date.getDay()]++;
      }
    });

    // 6. Pending leave requests (drives the dashboard "คำขอรออนุมัติ" card).
    const pendingLeave = leave.filter(
      (l: any) => (l.status || 'Pending').toString().toLowerCase() === 'pending',
    ).length;

    // 7. Upcoming meetings — real scheduled events from the Meetings sheet, from
    // today onward, soonest first, capped to the next few for the timeline.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const upcoming = meetings
      .map((m: any) => ({ m, d: parseFlexibleDate(m.date) }))
      .filter((x): x is { m: any; d: Date } => x.d !== null && x.d >= startOfToday)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 4)
      .map(({ m, d }) => ({
        title: m.title || 'ประชุม',
        date: d.toISOString().slice(0, 10),
        startTime: m.startTime || '',
        endTime: m.endTime || '',
        location: m.location || '',
      }));

    return NextResponse.json({
      summary: {
        totalEmployees,
        avgAttendance: `${avgAttendance}%`,
        monthlyPayroll: monthlyPayrollSum,
        turnoverRate: `${turnoverRate}%`,
        pendingLeave,
      },
      departmentDistribution,
      weeklyAttendance: weeklyData,
      upcoming,
    });

  } catch (error) {
    console.error('API Error (Reports):', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
