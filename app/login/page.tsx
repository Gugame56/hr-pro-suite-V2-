"use client";

import { useState } from "react";
import { ShieldCheck, User, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // ตรวจสอบกับ Google Sheets (ตาราง Users) ผ่าน API จริง
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      localStorage.setItem("hr_session", JSON.stringify(data.user));
      router.push("/");
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden text-white font-sans">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6]/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-500">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="bg-[#8B5CF6] text-white p-1.5 rounded-lg text-lg font-bold shadow-lg shadow-[#8B5CF6]/20">HR</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">HR Pro Suite</h1>
          </div>
          <p className="text-[#9CA3AF] text-sm font-medium">ยินดีต้อนรับเข้าสู่ระบบจัดการบุคลากร</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#151923] border border-gray-800 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Role Switcher */}
          <div className="flex p-1.5 bg-[#0B0E14]/50 m-6 rounded-2xl border border-gray-800">
            <button 
              onClick={() => { setRole("employee"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === "employee" 
                ? "bg-gray-800 text-white shadow-lg" 
                : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              <User size={18} />
              พนักงาน
            </button>
            <button 
              onClick={() => { setRole("admin"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === "admin" 
                ? "bg-[#8B5CF6] text-white shadow-lg" 
                : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              <ShieldCheck size={18} />
              ผู้ดูแล / ผู้จัดการ
            </button>
          </div>

          <form onSubmit={handleLogin} className="px-8 pb-6 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-xl text-center animate-shake">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">อีเมลผู้ใช้งาน</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#8B5CF6] transition-colors" size={18} />
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">รหัสผ่าน</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#8B5CF6] transition-colors" size={18} />
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600 shadow-inner"
                />
              </div>
            </div>

            <button 
              disabled={isLoading}
              type="submit"
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xl ${
                role === "admin" 
                ? "bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-[#8B5CF6]/20" 
                : "bg-gray-700 hover:bg-gray-600 shadow-black/20"
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] mt-2`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  เข้าสู่ระบบในฐานะ{role === "admin" ? "ผู้ดูแล/ผู้จัดการ" : "พนักงาน"}
                  <ArrowRight size={18} className="ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Test Credentials Hint */}
          <div className="px-8 pb-8">
            <div className="bg-[#0B0E14]/30 border border-gray-800/50 rounded-2xl p-4 text-[10px]">
              <p className="text-[#8B5CF6] font-bold mb-2 uppercase tracking-tighter">ตัวอย่างสำหรับทดสอบ (Test Account)</p>
              <div className="space-y-1 text-gray-400">
                <p><span className="text-white font-medium">Admin:</span> admin@hrpro.com / admin123</p>
                <p><span className="text-white font-medium">Manager:</span> manager@hrpro.com / manager123</p>
                <p><span className="text-white font-medium">User:</span> user@hrpro.com / user123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-8 text-[11px] text-[#9CA3AF] font-medium tracking-wide">
          © 2024 HR PRO SUITE • NEXT-GEN HUMAN RESOURCE OS
        </p>
      </div>
    </div>
  );
}
