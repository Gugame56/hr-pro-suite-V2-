// =============================================================================
// ReportsController — แปลงจาก app/api/reports/route.ts
// Aggregation report: employees, attendance, payroll, leave, meetings
// =============================================================================

import { NextResponse } from 'next/server';
import { BaseRepository } from '../repositories/BaseRepository';
import { DateService } from '../services/DateService';
import { PayrollService } from '../services/PayrollService';

export class ReportsController {
  private static _instance: ReportsController;
  private readonly payrollSvc: PayrollService;

  constructor() {
    this.payrollSvc = PayrollService.getInstance();
    this.handleGet = this.handleGet.bind(this);
  }

  static getInstance(): ReportsController {
    if (!ReportsController._instance) {
      ReportsController._instance = new ReportsController();
    }
    return ReportsController._instance;
  }

  async handleGet(): Promise<NextResponse> {
    try {
      const [employees, attendance, payroll, resignations, leave, meetings] = await Promise.all([
        new BaseRepository('Employees').getAll(),
        new BaseRepository('Attendance').getAll(),
        new BaseRepository('Payroll').getAll(),
        new BaseRepository('Resignations').getAll(),
        new BaseRepository('LeaveRequests').getAll().catch(() => []),
        new BaseRepository('Meetings').getAll().catch(() => []),
      ]);

      const totalEmployees = employees.length;

      // Avg Attendance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAttendance = attendance.filter((a: any) => {
        const date = DateService.parseFlexibleDate(a.date || a.timestamp);
        return date !== null && date >= thirtyDaysAgo;
      });
      const avgAttendance = totalEmployees > 0
        ? Math.round((recentAttendance.length / (totalEmployees * 22)) * 100)
        : 0;

      // Monthly Payroll Sum
      const { month: curMonth, year: curYear } = this.payrollSvc.currentPeriod();
      const monthlyPayrollSum = payroll.reduce((acc: number, p: any) => {
        if (p.month === curMonth && (p.year || '').toString() === curYear) {
          return acc + this.payrollSvc.num(p.netPay);
        }
        return acc;
      }, 0);

      // Turnover Rate (12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const yearlyResignations = resignations.filter((r: any) => {
        const date = DateService.parseFlexibleDate(r.resignationDate);
        return date !== null && date >= oneYearAgo;
      }).length;
      const turnoverRate = totalEmployees > 0
        ? ((yearlyResignations / totalEmployees) * 100).toFixed(1)
        : '0.0';

      // Department Distribution
      const deptCounts: Record<string, number> = {};
      employees.forEach((e: any) => {
        const dept = e.department || 'Unassigned';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      const departmentDistribution = Object.entries(deptCounts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Weekly Attendance
      const weeklyData = [0, 0, 0, 0, 0, 0, 0];
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      attendance.forEach((a: any) => {
        const date = DateService.parseFlexibleDate(a.date || a.timestamp);
        if (date !== null && date >= startOfWeek) {
          weeklyData[date.getDay()]++;
        }
      });

      // Pending leave
      const pendingLeave = leave.filter(
        (l: any) => (l.status || 'Pending').toString().toLowerCase() === 'pending',
      ).length;

      // Upcoming meetings
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcoming = meetings
        .map((m: any) => ({ m, d: DateService.parseFlexibleDate(m.date) }))
        .filter((x: any): x is { m: any; d: Date } => x.d !== null && x.d >= startOfToday)
        .sort((a: any, b: any) => a.d.getTime() - b.d.getTime())
        .slice(0, 4)
        .map(({ m, d }: any) => ({
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
}
