"use client";

import { FileText, Download, Clock, CheckCircle } from "lucide-react";

export default function EmploymentCertPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">ขอใบรับรองการทำงาน</h2>
        <p className="text-textMuted text-sm">ยื่นคำขอเพื่อรับเอกสารรับรองสถานะการเป็นพนักงาน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">ฟอร์มคำขอ</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-textMuted uppercase mb-1">เหตุผลในการขอ</label>
              <select className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple text-white">
                <option>เพื่อทำธุรกรรมทางการเงิน</option>
                <option>เพื่อยื่นขอวีซ่า</option>
                <option>เพื่อศึกษาต่อ</option>
                <option>อื่นๆ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-textMuted uppercase mb-1">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
              <textarea 
                className="w-full bg-bgDark border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brandPurple text-white h-24"
                placeholder="ระบุรายละเอียดเพิ่มเติม..."
              ></textarea>
            </div>
            <button className="w-full bg-brandPurple hover:bg-purple-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brandPurple/20">
              ส่งคำขอเอกสาร
            </button>
          </form>
        </div>

        <div className="bg-cardDark border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">ประวัติคำขอ</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-bgDark/50 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brandGreen/10 text-brandGreen rounded-lg">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">ใบรับรองการทำงาน (ยื่นวีซ่า)</p>
                  <p className="text-xs text-textMuted">15 พ.ค. 2567 • อนุมัติแล้ว</p>
                </div>
              </div>
              <button className="text-brandPurple hover:underline text-xs flex items-center gap-1">
                <Download size={14} /> ดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
