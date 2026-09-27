'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PLAN_PRICING, type PlanDuration } from '@/lib/subscription';
import {
  Building2,
  User,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Star,
  Sparkles,
  Crown,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function RegisterCompanyPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanDuration>('1y');
  const [formData, setFormData] = useState({
    companyName: '',
    taxId: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    slipUrl: '',
  });

  // QR Code States
  const [qrType, setQrType] = useState<'dynamic' | 'custom'>('dynamic');
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(false);

  // Slip & Verification States
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>('');
  const [verifyingSlip, setVerifyingSlip] = useState<boolean>(false);
  const [slipResult, setSlipResult] = useState<any>(null);
  const [isSlipVerified, setIsSlipVerified] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic PromptPay QR code whenever selectedPlan changes
  useEffect(() => {
    let isMounted = true;
    async function fetchQR() {
      setLoadingQr(true);
      try {
        const amount = PLAN_PRICING[selectedPlan].price;
        const res = await fetch(`/api/promptpay-qr?amount=${amount}`);
        const data = await res.json();
        if (isMounted && data.success && data.qrDataUrl) {
          setDynamicQrUrl(data.qrDataUrl);
        }
      } catch (err) {
        console.error('Failed to load dynamic QR:', err);
      } finally {
        if (isMounted) setLoadingQr(false);
      }
    }

    fetchQR();
    // Reset verification if user changes plan
    setSlipResult(null);
    setIsSlipVerified(false);

    return () => {
      isMounted = false;
    };
  }, [selectedPlan]);

  // Handle slip file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพสลิป (PNG, JPG, WEBP)');
      return;
    }

    setSlipFile(file);
    setSlipResult(null);
    setIsSlipVerified(false);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSlipPreview(dataUrl);
      setFormData((prev) => ({ ...prev, slipUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Verify slip
  const handleVerifySlip = async () => {
    const slipPayload = slipPreview || formData.slipUrl;
    if (!slipPayload) {
      setError('กรุณาเลือกไฟล์สลิปหรือระบุ URL รูปภาพสลิปก่อนกดตรวจสอบ');
      return;
    }

    setVerifyingSlip(true);
    setError('');
    setSlipResult(null);

    try {
      const res = await fetch('/api/auth/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipData: slipPayload,
          planDuration: selectedPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');

      setSlipResult(data);
      if (data.valid && data.isAmountMatch) {
        setIsSlipVerified(true);
      } else {
        setIsSlipVerified(false);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถตรวจสอบสลิปได้');
    } finally {
      setVerifyingSlip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (formData.adminPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    // Require verified slip if a slip is uploaded
    if ((slipPreview || formData.slipUrl) && !isSlipVerified) {
      setError('กรุณากดปุ่ม "ตรวจสอบสลิปโอนเงิน" และยืนยันความถูกต้องก่อนดำเนินการ');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          taxId: formData.taxId,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          phone: formData.phone,
          planDuration: selectedPlan,
          slipUrl: slipPreview || formData.slipUrl,
          isSlipVerified,
          transRef: slipResult?.transRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const planBadge = (key: PlanDuration) => {
    if (key === '1y') return { icon: Crown, text: 'ยอดนิยม', color: 'bg-amber-500 text-white' };
    if (key === '2y') return { icon: Sparkles, text: 'คุ้มสุด', color: 'bg-emerald-500 text-white' };
    return null;
  };

  // ── Success screen ──
  if (result) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 relative overflow-hidden text-white font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/10 blur-[120px] rounded-full"></div>

        <div className="max-w-lg w-full bg-[#151923] border border-gray-800 rounded-[32px] shadow-2xl p-8 text-center z-10">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">ลงทะเบียนบริษัทสำเร็จ!</h2>
          <p className="text-gray-400 mb-6 text-sm">
            จดจำและบันทึกรหัสบริษัทนี้สำหรับส่งให้พนักงานทุกคนเพื่อเข้าสู่ระบบ
          </p>

          <div className="bg-[#0B0E14] p-6 rounded-2xl border border-gray-800 mb-6">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
              รหัสบริษัทของคุณ (Company Code)
            </span>
            <span className="text-4xl font-extrabold text-[#8B5CF6] tracking-widest font-mono">
              {result.companyCode}
            </span>
          </div>

          <div className="text-left text-sm text-gray-400 space-y-2 mb-6 bg-[#0B0E14]/50 p-4 rounded-xl border border-gray-800">
            <p>
              <strong className="text-white">ชื่อบริษัท:</strong> {result.companyName}
            </p>
            <p>
              <strong className="text-white">อีเมลผู้ดูแล:</strong> {result.adminEmail}
            </p>
            <p>
              <strong className="text-white">แพ็กเกจ:</strong>{' '}
              {PLAN_PRICING[result.planDuration as PlanDuration]?.label}
            </p>
            <p>
              <strong className="text-white">วันสิ้นสุดแพ็กเกจ:</strong>{' '}
              {new Date(result.subscriptionEnd).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p>
              <strong className="text-white">สถานะการชำระเงิน:</strong>{' '}
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  result.paymentStatus === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {result.paymentStatus === 'completed' ? 'ชำระแล้ว (อนุมัติทันที)' : 'รอตรวจสอบ'}
              </span>
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-2xl shadow-xl shadow-[#8B5CF6]/20 transition active:scale-[0.98]"
          >
            ไปที่หน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen bg-[#0B0E14] py-8 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3B82F6]/10 blur-[120px] rounded-full"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft size={16} /> กลับหน้า Login
          </Link>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="bg-[#8B5CF6] text-white p-1.5 rounded-lg text-lg font-bold shadow-lg shadow-[#8B5CF6]/20">
                HR
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">HR Pro Suite</h1>
            </div>
            <h2 className="text-3xl font-extrabold text-white">สมัครใช้งานแพลตฟอร์ม HR สำหรับองค์กร</h2>
            <p className="text-gray-400 mt-2">
              บริหารพนักงาน ขาด ลา มาสาย และเงินเดือน — แยกพื้นที่ข้อมูลปลอดภัยสำหรับบริษัทคุณ
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#151923] border border-gray-800 rounded-[32px] shadow-2xl p-6 sm:p-10 space-y-8"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Section 1: Company Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800 flex items-center gap-2">
              <Building2 size={20} className="text-[#8B5CF6]" /> 1. ข้อมูลบริษัท
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  ชื่อบริษัท / นิติบุคคล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บริษัท อินโนเวชั่น จำกัด"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  placeholder="13 หลัก"
                  maxLength={13}
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600 font-mono"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  เบอร์โทรศัพท์ติดต่อ *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="08X-XXX-XXXX"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Admin Account */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800 flex items-center gap-2">
              <User size={20} className="text-[#8B5CF6]" /> 2. ข้อมูลผู้ดูแลระบบหลัก (Super Admin)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="สมชาย ใจดี"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  อีเมลผู้ใช้งาน (Username) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  กำหนดรหัสผ่าน *
                </label>
                <input
                  type="password"
                  required
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                  ยืนยันรหัสผ่าน *
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  className="w-full bg-[#0B0E14]/50 border border-gray-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:border-[#8B5CF6] transition-all text-white placeholder:text-gray-600"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Plan Selection */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800 flex items-center gap-2">
              <Star size={20} className="text-[#8B5CF6]" /> 3. เลือกระยะเวลาการใช้งาน
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(Object.keys(PLAN_PRICING) as PlanDuration[]).map((key) => {
                const plan = PLAN_PRICING[key];
                const isSelected = selectedPlan === key;
                const badge = planBadge(key);
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 text-center transition-all relative ${
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-lg shadow-[#8B5CF6]/10'
                        : 'border-gray-800 hover:border-gray-700 bg-[#0B0E14]/30'
                    }`}
                  >
                    {badge && (
                      <div
                        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${badge.color} px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 shadow`}
                      >
                        <badge.icon size={10} /> {badge.text}
                      </div>
                    )}
                    <div className="font-bold text-white text-sm mt-1">{plan.label}</div>
                    <div
                      className={`text-xl font-extrabold mt-2 ${
                        isSelected ? 'text-[#8B5CF6]' : 'text-gray-300'
                      }`}
                    >
                      ฿{plan.price.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{plan.days} วัน</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{plan.discount}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Payment with Real QR Code & Automated Verification */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard size={20} className="text-[#8B5CF6]" /> 4. ชำระเงินค่าบริการ
              </span>
              <div className="flex bg-[#0B0E14] border border-gray-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setQrType('dynamic')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    qrType === 'dynamic' ? 'bg-[#8B5CF6] text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  PromptPay QR ไดนามิก
                </button>
                <button
                  type="button"
                  onClick={() => setQrType('custom')}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    qrType === 'custom' ? 'bg-[#8B5CF6] text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  รูป QR ร้านค้า
                </button>
              </div>
            </h3>

            <div className="bg-[#0B0E14]/50 p-6 rounded-2xl border border-gray-800 space-y-6">
              {/* QR and Transfer Instruction */}
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0 w-52 text-center">
                  <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <QrCode size={14} className="text-blue-600" /> พร้อมเพย์ (PromptPay)
                  </div>

                  <div className="w-44 h-44 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 relative">
                    {loadingQr ? (
                      <Loader2 className="animate-spin text-[#8B5CF6]" size={28} />
                    ) : qrType === 'dynamic' && dynamicQrUrl ? (
                      <img
                        src={dynamicQrUrl}
                        alt="PromptPay QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src="/qr-payment.png"
                        alt="QR Code ร้านค้า"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback if custom image is missing
                          (e.target as any).src = dynamicQrUrl;
                        }}
                      />
                    )}
                  </div>

                  <div className="text-xs font-extrabold text-blue-700 mt-2">
                    ยอดชำระ: ฿{PLAN_PRICING[selectedPlan].price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-700 font-mono font-bold mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    พร้อมเพย์: 140000996792631
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    {qrType === 'dynamic' ? 'สแกนพร้อมใส่ยอดเงินอัตโนมัติ' : 'รูป QR จาก /public/qr-payment.png'}
                  </div>
                </div>

                <div className="flex-1 space-y-3 text-sm">
                  <div className="bg-[#151923] p-4 rounded-xl border border-gray-800 space-y-2">
                    <p className="font-semibold text-white">ขั้นตอนการชำระเงินและตรวจสอบสลิป:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-300">
                      <li>เปิดแอปธนาคารของคุณ และสแกน QR Code ทางซ้ายมือ</li>
                      <li>
                        ตรวจสอบยอดเงินให้ตรงกับแพ็กเกจที่เลือก{' '}
                        <strong className="text-[#8B5CF6]">
                          (฿{PLAN_PRICING[selectedPlan].price.toLocaleString()})
                        </strong>
                      </li>
                      <li>ทำการโอนเงิน และบันทึกรูปสลิปจากแอปธนาคาร</li>
                      <li>อัปโหลดรูปสลิปด้านล่าง เพื่อให้ระบบตรวจสอบความถูกต้องอัตโนมัติ</li>
                    </ol>
                  </div>

                  {/* Upload slip section */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-1 tracking-wider">
                      อัปโหลดรูปภาพสลิปโอนเงิน (สลิปธนาคารที่มี QR Code) *
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-3 bg-[#151923] border border-gray-700 hover:border-[#8B5CF6] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-white transition hover:bg-[#8B5CF6]/10"
                      >
                        <Upload size={16} />
                        {slipFile ? 'เปลี่ยนรูปสลิป' : 'เลือกรูปสลิปจากอุปกรณ์'}
                      </button>

                      <div className="flex-1 w-full">
                        <input
                          type="url"
                          placeholder="หรือวางลิงก์รูปสลิป (https://...)"
                          value={formData.slipUrl.startsWith('data:') ? '' : formData.slipUrl}
                          onChange={(e) => {
                            setFormData({ ...formData, slipUrl: e.target.value });
                            setSlipPreview(e.target.value);
                            setSlipResult(null);
                            setIsSlipVerified(false);
                          }}
                          className="w-full bg-[#151923] border border-gray-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-[#8B5CF6] transition text-white placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slip Preview & Verify Action */}
              {slipPreview && (
                <div className="p-4 bg-[#151923] border border-gray-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-black/40 rounded-xl overflow-hidden border border-gray-700 shrink-0">
                        <img
                          src={slipPreview}
                          alt="Slip Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-[#8B5CF6]" />
                          {slipFile ? slipFile.name : 'สลิปโอนเงินที่ระบุ'}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          แพ็กเกจที่ต้องชำระ: ฿{PLAN_PRICING[selectedPlan].price.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={verifyingSlip}
                      onClick={handleVerifySlip}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                        isSlipVerified
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-[#8B5CF6]/20'
                      } disabled:opacity-50`}
                    >
                      {verifyingSlip ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังตรวจสอบสลิป...
                        </>
                      ) : isSlipVerified ? (
                        <>
                          <CheckCircle size={16} />
                          สลิปได้รับการยืนยันแล้ว
                        </>
                      ) : (
                        <>
                          <FileCheck size={16} />
                          กดตรวจสอบสลิปโอนเงิน
                        </>
                      )}
                    </button>
                  </div>

                  {/* Verification result details */}
                  {slipResult && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        slipResult.valid && slipResult.isAmountMatch
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/40 text-red-300'
                      }`}
                    >
                      {slipResult.valid && slipResult.isAmountMatch ? (
                        <ShieldCheck size={18} className="shrink-0 text-emerald-400 mt-0.5" />
                      ) : (
                        <AlertTriangle size={18} className="shrink-0 text-red-400 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-bold">{slipResult.message}</div>
                        {slipResult.transRef && (
                          <div className="text-[11px] text-gray-400">
                            รหัสอ้างอิง: <span className="font-mono text-white">{slipResult.transRef}</span> |{' '}
                            ยอดเงินตรวจพบ: ฿{slipResult.amount?.toLocaleString()}
                          </div>
                        )}
                        {!slipResult.isAmountMatch && (
                          <div className="text-[11px] text-red-400 font-semibold">
                            ⚠️ ยอดเงินในสลิปต้องตรงกับราคาแพ็กเกจ ฿
                            {PLAN_PRICING[selectedPlan].price.toLocaleString()} พอดี
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition duration-150 flex items-center justify-center gap-2 active:scale-[0.98] ${
              slipPreview && !isSlipVerified
                ? 'bg-gray-700 cursor-not-allowed opacity-60'
                : 'bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-[#8B5CF6]/20'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                กำลังประมวลผลและเปิดใช้งานระบบ...
              </>
            ) : slipPreview && !isSlipVerified ? (
              'กรุณาตรวจสอบสลิปให้ผ่านก่อนยืนยัน'
            ) : (
              'ยืนยันการสมัครและเปิดใช้งานระบบ'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
