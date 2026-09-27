"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText, Upload, Download, Trash2, Search, CheckCircle2,
  AlertCircle, Loader2, Plus, Building2, User, Users, X, Eye,
  FileSpreadsheet, FileArchive, Image as ImageIcon, Check,
} from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  targetType: "all" | "department" | "specific";
  targetDepartment?: string;
  targetEmployeeId?: string;
  targetEmployeeName: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  acknowledgedBy?: string[];
  createdAt: string;
}

export default function DocumentsPage() {
  const [userRole, setUserRole] = useState<string>("employee");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State สำหรับการอัปโหลด
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ระเบียบบริษัท");
  const [targetType, setTargetType] = useState<"all" | "department" | "specific">("all");
  const [targetDepartment, setTargetDepartment] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetEmployeeName, setTargetEmployeeName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const categories = ["ทั้งหมด", "ระเบียบบริษัท", "สัญญาจ้าง", "แบบฟอร์ม", "เอกสารภาษี", "สวัสดิการ", "อื่นๆ"];

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    // ดึงข้อมูล Session ผู้ใช้
    const stored = localStorage.getItem("hr_session") || localStorage.getItem("user");
    let userObj: any = null;
    if (stored) {
      try {
        userObj = JSON.parse(stored);
        setCurrentUser(userObj);
        setUserRole((userObj.role || "employee").toLowerCase());
      } catch (e) {
        console.error("Parse user error:", e);
      }
    }

    fetchDocuments(userObj);
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [depRes, empRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/employees"),
      ]);
      const depData = await depRes.json();
      const empData = await empRes.json();
      if (Array.isArray(depData)) setDepartments(depData);
      if (Array.isArray(empData)) setEmployees(empData);
    } catch {
      // ignore
    }
  };

  const fetchDocuments = async (userObj?: any) => {
    try {
      setLoading(true);
      const u = userObj || currentUser;
      const empId = u?.employeeId || u?.id || "";
      const role = (u?.role || userRole || "employee").toLowerCase();
      const dept = u?.department || "";

      const res = await fetch(`/api/documents?employeeId=${empId}&role=${role}&department=${dept}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err: any) {
      showNotification("ไม่สามารถโหลดเอกสารได้: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      showNotification("กรุณาระบุชื่อเอกสารและเลือกไฟล์", "error");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("targetType", targetType);
      formData.append("targetDepartment", targetDepartment);
      formData.append("targetEmployeeId", targetEmployeeId);
      formData.append("targetEmployeeName", targetEmployeeName);
      formData.append("uploadedBy", currentUser?.name || "Admin/Manager");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showNotification("อัปโหลดและเผยแพร่เอกสารเรียบร้อยแล้ว");
        setTitle("");
        setFile(null);
        setTargetType("all");
        setTargetDepartment("");
        setTargetEmployeeId("");
        setTargetEmployeeName("");
        setShowUploadModal(false);
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        fetchDocuments();
      } else {
        showNotification("เกิดข้อผิดพลาด: " + (data.error || "อัปโหลดไม่สำเร็จ"), "error");
      }
    } catch (err: any) {
      showNotification("ไม่สามารถอัปโหลดได้: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้?")) return;
    try {
      const res = await fetch(`/api/documents?id=${id}&actor=${currentUser?.name || userRole}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showNotification("ลบเอกสารเรียบร้อยแล้ว");
        fetchDocuments();
      } else {
        showNotification("ลบไม่สำเร็จ: " + data.error, "error");
      }
    } catch (err: any) {
      showNotification("เกิดข้อผิดพลาด: " + err.message, "error");
    }
  };

  const handleAcknowledge = async (docId: string) => {
    const empId = currentUser?.employeeId || currentUser?.id;
    if (!empId) return;

    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, employeeId: empId, action: "acknowledge" }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("บันทึกการรับทราบเอกสารแล้ว");
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, acknowledgedBy: [...(d.acknowledgedBy || []), empId] }
              : d
          )
        );
      }
    } catch (err: any) {
      showNotification("เกิดข้อผิดพลาด: " + err.message, "error");
    }
  };

  const canManage = userRole === "admin" || userRole === "manager" || userRole === "hr";
  const myEmpId = currentUser?.employeeId || currentUser?.id || "";

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(search.toLowerCase()) ||
        doc.category.toLowerCase().includes(search.toLowerCase()) ||
        (doc.targetEmployeeName || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "ทั้งหมด" || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, search, selectedCategory]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="text-red-500" size={20} />;
    if (["xls", "xlsx", "csv"].includes(ext || "")) return <FileSpreadsheet className="text-emerald-500" size={20} />;
    if (["doc", "docx"].includes(ext || "")) return <FileText className="text-blue-500" size={20} />;
    if (["zip", "rar"].includes(ext || "")) return <FileArchive className="text-amber-500" size={20} />;
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return <ImageIcon className="text-purple-500" size={20} />;
    return <FileText className="text-gray-400" size={20} />;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
            notification.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {notification.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-brandPurple" size={26} />
            ศูนย์เอกสารพนักงาน (Document Center)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            ดาวน์โหลดเอกสารบริษัท ระเบียบข้อบังคับ นโยบาย และเอกสารเฉพาะบุคคล
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-brandPurple/10 text-brandPurple border border-brandPurple/20">
            สถานะของคุณ: {userRole.toUpperCase()}
          </span>

          {canManage && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-brandPurple hover:bg-purple-600 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-md shadow-brandPurple/20 transition-all hover:scale-[1.02]"
            >
              <Plus size={16} />
              อัปโหลดเอกสารใหม่
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-cardDark border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-brandPurple text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="ค้นหาเอกสารหรือชื่อไฟล์..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
            />
          </div>
        </div>

        {/* Document Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          {loading ? (
            <div className="text-center py-16 text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-brandPurple" size={28} />
              <span className="text-sm">กำลังโหลดรายการเอกสาร...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center mb-3 text-2xl">
                📁
              </div>
              <p className="font-semibold text-gray-600 dark:text-gray-300">ไม่พบเอกสารตามเงื่อนไขที่เลือก</p>
              {canManage && (
                <p className="text-xs text-gray-400 mt-1">กดปุ่ม "อัปโหลดเอกสารใหม่" เพื่อเพิ่มเอกสารเข้าสู่ระบบ</p>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">ชื่อเอกสาร</th>
                  <th className="py-3.5 px-4">หมวดหมู่</th>
                  <th className="py-3.5 px-4">กลุ่มเป้าหมาย</th>
                  <th className="py-3.5 px-4">ขนาดไฟล์</th>
                  <th className="py-3.5 px-4">วันที่เผยแพร่</th>
                  <th className="py-3.5 px-4 text-center">ดาวน์โหลด / ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
                {filteredDocs.map((doc) => {
                  const isAcknowledged = (doc.acknowledgedBy || []).includes(myEmpId);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0 mt-0.5">
                            {getFileIcon(doc.fileName)}
                          </div>
                          <div>
                            <div className="text-gray-900 dark:text-white font-semibold group-hover:text-brandPurple transition-colors">
                              {doc.title}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 font-mono">{doc.fileName}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {doc.targetType === "all" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-medium">
                            <Users size={12} /> ทุกคน
                          </span>
                        ) : doc.targetType === "department" ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full font-medium">
                            <Building2 size={12} /> {doc.targetDepartment || "แผนก"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full font-medium">
                            <User size={12} /> {doc.targetEmployeeName || doc.targetEmployeeId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {doc.fileSize}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Secure Download Button */}
                          <a
                            href={`/api/documents/download?id=${doc.id}&employeeId=${myEmpId}&role=${userRole}`}
                            download={doc.fileName}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition inline-flex items-center gap-1.5 shadow-sm"
                            title="ดาวน์โหลดเอกสารอย่างปลอดภัย"
                          >
                            <Download size={13} />
                            <span>ดาวน์โหลด</span>
                          </a>

                          {/* Acknowledge Button for Employees */}
                          {userRole === "employee" && (
                            <button
                              type="button"
                              onClick={() => !isAcknowledged && handleAcknowledge(doc.id)}
                              disabled={isAcknowledged}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition inline-flex items-center gap-1 ${
                                isAcknowledged
                                  ? "bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 cursor-default"
                                  : "bg-brandPurple/10 hover:bg-brandPurple/20 text-brandPurple border border-brandPurple/30"
                              }`}
                              title={isAcknowledged ? "คุณได้รับทราบเอกสารนี้แล้ว" : "กดเพื่อบันทึกการรับทราบ"}
                            >
                              <Check size={13} />
                              <span>{isAcknowledged ? "รับทราบแล้ว" : "กดรับทราบ"}</span>
                            </button>
                          )}

                          {/* Delete Button for Admin / Manager */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition"
                              title="ลบเอกสารนี้"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Modal (Admin & Manager) */}
      {showUploadModal && canManage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-cardDark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <Upload className="text-brandPurple" size={20} />
                อัปโหลดเอกสารใหม่ (Admin & Manager)
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  ชื่อเอกสาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ประกาศวันหยุดและระเบียบปฏิบัติประจำปี 2026"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    หมวดหมู่เอกสาร
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
                  >
                    {categories.filter((c) => c !== "ทั้งหมด").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    กลุ่มเป้าหมายผู้รับ
                  </label>
                  <select
                    value={targetType}
                    onChange={(e: any) => setTargetType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
                  >
                    <option value="all">พนักงานทุกคน (All)</option>
                    <option value="department">เฉพาะแผนก (Department)</option>
                    <option value="specific">ระบุพนักงานรายบุคคล (Specific Employee)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Target Selection */}
              {targetType === "department" && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    เลือกแผนกเป้าหมาย <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
                  >
                    <option value="">-- กรุณาเลือกแผนก --</option>
                    {departments.map((d: any) => (
                      <option key={d.id || d.name} value={d.name || d.id}>
                        {d.name || d.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "specific" && (
                <div className="animate-in fade-in duration-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      เลือกพนักงานเป้าหมาย <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetEmployeeId}
                      onChange={(e) => {
                        const emp = employees.find((x: any) => x.id === e.target.value);
                        setTargetEmployeeId(e.target.value);
                        setTargetEmployeeName(emp ? emp.name : "");
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brandPurple/50"
                    >
                      <option value="">-- เลือกจากรายชื่อพนักงาน --</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.id} - {emp.name} ({emp.department || "ทั่วไป"})
                        </option>
                      ))}
                    </select>
                  </div>
                  {!targetEmployeeId && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="หรือกรอกรหัสพนักงาน (เช่น EMP-001)"
                        value={targetEmployeeId}
                        onChange={(e) => setTargetEmployeeId(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ชื่อ-นามสกุลพนักงาน"
                        value={targetEmployeeName}
                        onChange={(e) => setTargetEmployeeName(e.target.value)}
                        className="flex-1 px-3.5 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white rounded-xl text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  ไฟล์เอกสาร (PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP สูงสุด 25MB) <span className="text-red-500">*</span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brandPurple/10 file:text-brandPurple hover:file:bg-brandPurple/20 cursor-pointer border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-2"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>เอกสารนี้จะถูกเก็บและควบคุมสิทธิ์ตามข้อกำหนด PDPA พนักงานจะเห็นเฉพาะเอกสารที่ตนเองมีสิทธิ์เท่านั้น</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-brandPurple hover:bg-purple-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md shadow-brandPurple/20 transition disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>กำลังอัปโหลด...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>อัปโหลดและเผยแพร่</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
