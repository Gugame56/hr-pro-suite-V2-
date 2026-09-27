"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  PlayCircle, 
  Upload, 
  CheckCircle, 
  Film, 
  X, 
  Plus, 
  AlertCircle 
} from "lucide-react";

interface Training {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  progress: number;
  isCompleted: boolean;
}

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  // สถานะผู้ใช้งานปัจจุบัน
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; name: string }>({
    id: "emp-01",
    role: "user",
    name: "พนักงาน",
  });

  // สถานะสำหรับฟอร์มอัปโหลด
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // สถานะสำหรับเครื่องเล่นวิดีโอ
  const [activeTraining, setActiveTraining] = useState<Training | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const canUpload = currentUser.role === "admin" || currentUser.role === "manager";

  // โหลดข้อมูลผู้ใช้จาก Local Storage
  useEffect(() => {
    const savedUser = localStorage.getItem("hr_session") || localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser({
          id: parsed.id || parsed.employeeId || "emp-01",
          role: (parsed.role || "user").toLowerCase(),
          name: parsed.name || "พนักงาน",
        });
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  // ดึงรายการหลักสูตร
  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/training?userId=${currentUser.id}`);
      const data = await res.json();
      if (data.trainings) {
        setTrainings(data.trainings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, [currentUser.id]);

  // ฟังก์ชันอัปโหลดวิดีโอและสร้างหลักสูตรใหม่
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title) {
      alert("กรุณากรอกชื่อหลักสูตรและแนบไฟล์วิดีโอ");
      return;
    }

    try {
      setUploading(true);

      // 1. อัปโหลดไฟล์วิดีโอ
      const uploadFormData = new FormData();
      uploadFormData.append("video", selectedFile);
      uploadFormData.append("role", currentUser.role);

      const uploadRes = await fetch("/api/training/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ");
      }

      // 2. บันทึกข้อมูลหลักสูตร
      const courseRes = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          videoUrl: uploadData.videoUrl,
          duration: "หลักสูตรวิดีโอ",
          role: currentUser.role,
        }),
      });

      if (!courseRes.ok) {
        const errorData = await courseRes.json();
        throw new Error(errorData.error || "สร้างหลักสูตรไม่สำเร็จ");
      }

      // รีเซ็ตสถานะฟอร์ม
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      setShowUploadModal(false);
      fetchTrainings();
      alert("อัปโหลดและเพิ่มหลักสูตรเรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenVideo = (item: Training) => {
    setActiveTraining(item);
    setCurrentProgress(item.progress || 0);
  };

  // ตรวจจับและอัปเดตเปอร์เซ็นต์ระหว่างเล่นวิดีโอ
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const duration = videoRef.current.duration;
    const currentTime = videoRef.current.currentTime;

    if (duration > 0) {
      const calculatedPct = Math.min(100, Math.round((currentTime / duration) * 100));
      setCurrentProgress((prev) => {
        const updated = Math.max(prev, calculatedPct);
        // บันทึกไปยัง Server ทุกๆ 5% หรือเมื่อครบ 100%
        if (updated > prev && (updated % 5 === 0 || updated === 100)) {
          saveProgress(updated);
        }
        return updated;
      });
    }
  };

  // เมื่อดูวิดีโอจบ ให้ปรับเป็น 100% ทันที
  const handleVideoEnded = () => {
    setCurrentProgress(100);
    saveProgress(100);
  };

  // บันทึกความคืบหน้าไปยัง Backend
  const saveProgress = async (pct: number) => {
    if (!activeTraining) return;
    try {
      await fetch("/api/training", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          trainingId: activeTraining.id,
          progress: pct,
        }),
      });

      setTrainings((prev) =>
        prev.map((t) =>
          t.id === activeTraining.id
            ? { ...t, progress: Math.max(t.progress, pct), isCompleted: pct >= 100 }
            : t
        )
      );
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ระบบอบรมพนักงาน (E-Training)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            สถานะของคุณ: <span className="font-semibold uppercase text-indigo-600 dark:text-indigo-400">{currentUser.role}</span>
            {canUpload ? " (มีสิทธิ์อัปโหลดวิดีโอ)" : " (โหมดรับชมและบันทึกการเรียนรู้)"}
          </p>
        </div>

        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            อัปโหลดคลิปอบรมใหม่
          </button>
        )}
      </div>

      {/* Training Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">กำลังโหลดหลักสูตร...</div>
      ) : trainings.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Film className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">ยังไม่มีหลักสูตรการอบรมในระบบ</p>
          {canUpload && <p className="text-sm text-gray-400 mt-1">กดปุ่ม "อัปโหลดคลิปอบรมใหม่" เพื่อเพิ่มวิดีโอ</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-cardDark border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 dark:hover:border-indigo-500/50 transition"
            >
              <div className="relative h-44 bg-slate-900 flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-500" />
                <button
                  onClick={() => handleOpenVideo(item)}
                  className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition group"
                >
                  <PlayCircle className="w-14 h-14 group-hover:scale-110 transition drop-shadow-md text-white" />
                </button>

                {item.progress >= 100 && (
                  <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                    <CheckCircle className="w-3.5 h-3.5" /> ผ่านการอบรม (100%)
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg line-clamp-1">{item.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                    {item.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-600 dark:text-gray-400">ความคืบหน้าในการดู</span>
                    <span className={item.progress >= 100 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-indigo-600 dark:text-indigo-400"}>
                      {item.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        item.progress >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <button
                    onClick={() => handleOpenVideo(item)}
                    className="w-full mt-3 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    {item.progress === 0 ? "เริ่มเรียน" : item.progress >= 100 ? "ดูซ้ำอีกครั้ง" : "เรียนต่อ"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {activeTraining && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-cardDark rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{activeTraining.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">ระบบจะทำการบันทึกเปอร์เซ็นต์การดูอัตโนมัติ</p>
              </div>
              <button
                onClick={() => {
                  setActiveTraining(null);
                  fetchTrainings();
                }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-black flex-1 relative flex items-center justify-center">
              <video
                ref={videoRef}
                src={activeTraining.videoUrl}
                controls
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                className="w-full max-h-[60vh] object-contain"
              />
            </div>

            <div className="p-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">เปอร์เซ็นต์การรับชม</span>
                <span
                  className={`text-base font-extrabold ${
                    currentProgress >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {currentProgress}% {currentProgress >= 100 && "✓ ครบ 100% แล้ว"}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 transition-all duration-200 ${
                    currentProgress >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                  }`}
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal (เฉพาะ Manager / Admin) */}
      {showUploadModal && canUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-cardDark rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> อัปโหลดคลิปอบรมใหม่
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ชื่อหลักสูตร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น มาตรฐานการทำงานและการรักษาความปลอดภัย"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียดหลักสูตร</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับเนื้อหาหลักสูตร"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ไฟล์วิดีโอ (MP4, WebM, MOV) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="video/*"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>ฟังก์ชันนี้เปิดให้เฉพาะ Manager และ Admin เท่านั้น พนักงานระดับทั่วไปจะไม่เห็นปุ่มนี้</span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow"
                >
                  {uploading ? "กำลังอัปโหลดคลิป..." : "บันทึกและเผยแพร่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
