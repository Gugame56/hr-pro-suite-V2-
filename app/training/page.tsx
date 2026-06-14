"use client";

import { useState, useEffect, useMemo } from "react";
import { GraduationCap, PlayCircle, Clock, BookOpen, Star, CheckCircle2, Loader2, Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { useCanManage } from "@/lib/useCanManage";
import { Kpi, DonutPanel, type Segment } from "@/lib/dashboardKit";

export default function TrainingPage() {
  // Admin/Manager only may add/edit/delete courses; employees browse read-only.
  const canManage = useCanManage();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    progress: 0,
    duration: "",
    rating: 5.0
  });
  const [notification, setNotification] = useState<any>(null);

  const currentEmployeeId = "EMP001";

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      // Training is a shared course catalogue — show every course to everyone,
      // not just the ones tagged to the current employee.
      const res = await fetch(`/api/training`);
      const data = await res.json();
      if (Array.isArray(data)) setCourses(data);
    } catch (err) {
      showNotification("Error fetching courses", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Bucket a course by its progress value.
  const courseStatus = (p: number) => (p >= 100 ? "completed" : p > 0 ? "in_progress" : "not_started");

  const filteredCourses = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return courses.filter(c => {
      const matchesSearch = (c.title || "").toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || courseStatus(parseInt(c.progress) || 0) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courses, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const completed = courses.filter(c => (parseInt(c.progress) || 0) >= 100).length;
    const inProgress = courses.filter(c => { const p = parseInt(c.progress) || 0; return p > 0 && p < 100; }).length;
    const avgRating = courses.length
      ? courses.reduce((s, c) => s + (parseFloat(c.rating) || 0), 0) / courses.length
      : 0;
    return { total: courses.length, completed, inProgress, avgRating };
  }, [courses]);

  const byStatus: Segment[] = useMemo(() => {
    const buckets = { completed: 0, in_progress: 0, not_started: 0 };
    for (const c of courses) buckets[courseStatus(parseInt(c.progress) || 0)]++;
    return [
      { label: "เรียนจบแล้ว", value: buckets.completed, hex: "#10b981" },
      { label: "กำลังเรียน", value: buckets.in_progress, hex: "#8b5cf6" },
      { label: "ยังไม่เริ่ม", value: buckets.not_started, hex: "#6b7280" },
    ].filter(s => s.value > 0);
  }, [courses]);

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData({ title: "", category: "", progress: 0, duration: "", rating: 5.0 });
    setIsModalOpen(true);
  };

  const openEditModal = (course: any) => {
    setEditingCourse(course);
    setFormData({
      title: course.title || "",
      category: course.category || "",
      progress: course.progress || 0,
      duration: course.duration || "",
      rating: course.rating || 5.0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editingCourse ? 'PATCH' : 'POST';
    const body = editingCourse ? { id: editingCourse.id, ...formData } : { ...formData, employeeId: currentEmployeeId };

    try {
      const res = await fetch('/api/training', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      showNotification(editingCourse ? "อัปเดตหลักสูตรสำเร็จ" : "เพิ่มหลักสูตรสำเร็จ");
      await fetchCourses();
      setIsModalOpen(false);
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหลักสูตรนี้?")) return;

    try {
      const res = await fetch(`/api/training?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      showNotification("ลบหลักสูตรสำเร็จ");
      await fetchCourses();
    } catch (err) {
      showNotification("เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-right ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-brandGreen'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">อบรม (Training & Development)</h2>
          <p className="text-textMuted text-sm">พัฒนาทักษะและเรียนรู้สิ่งใหม่เพื่อการเติบโตในสายอาชีพ</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-brandPurple hover:bg-brandPurple/90 text-white px-4 py-2 rounded-lg transition-all font-medium shadow-lg shadow-brandPurple/20"
          >
            <Plus size={18} />
            เพิ่มหลักสูตร
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<BookOpen size={22} />} tint="bg-blue-500/10 text-blue-500" label="หลักสูตรทั้งหมด" value={stats.total} sub="หลักสูตร" />
        <Kpi icon={<CheckCircle2 size={22} />} tint="bg-brandGreen/10 text-brandGreen" label="เรียนจบแล้ว" value={stats.completed} sub="หลักสูตร" />
        <Kpi icon={<PlayCircle size={22} />} tint="bg-brandPurple/10 text-brandPurple" label="กำลังเรียน" value={stats.inProgress} sub="หลักสูตร" />
        <Kpi icon={<Star size={22} />} tint="bg-amber-500/10 text-amber-500" label="คะแนนรีวิวเฉลี่ย" value={stats.avgRating.toFixed(1)} sub="จากเต็ม 5.0" />
      </div>

      {/* Distribution */}
      <DonutPanel title="สถานะความคืบหน้าการเรียน" subtitle="จำนวนหลักสูตรแยกตามสถานะ" segments={byStatus} centerLabel="หลักสูตร" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="ค้นหาชื่อหลักสูตร, หมวดหมู่..."
            className="w-full bg-cardDark border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brandPurple text-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-cardDark border border-gray-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-brandPurple">
          <option value="all">ทุกสถานะ</option>
          <option value="completed">เรียนจบแล้ว</option>
          <option value="in_progress">กำลังเรียน</option>
          <option value="not_started">ยังไม่เริ่ม</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="lg:col-span-2 bg-cardDark border border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-brandPurple mb-4" size={40} />
            <p className="text-textMuted animate-pulse">กำลังโหลดหลักสูตร...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="lg:col-span-2 bg-cardDark border border-gray-800 rounded-2xl p-20 text-center">
            <p className="text-textMuted">ไม่พบหลักสูตรการอบรม</p>
          </div>
        ) : (
          filteredCourses.map((course, i) => {
            const progress = parseInt(course.progress) || 0;
            const done = progress >= 100;
            return (
              <div key={course.id || i} className="bg-cardDark border border-gray-800 rounded-2xl p-6 hover:border-brandPurple/50 transition-all group relative">
                <div className="flex gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-brandPurple/10 transition-colors relative overflow-hidden">
                    <GraduationCap className="text-gray-600 group-hover:text-brandPurple transition-colors" size={36} />
                    {done && (
                      <div className="absolute top-0 right-0 bg-brandGreen text-white p-1 rounded-bl-lg">
                        <Star size={10} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-textMuted text-[10px] font-bold uppercase tracking-wider">
                        {course.category}
                      </span>
                      <div className="flex items-center gap-1 text-textMuted text-[10px]">
                        <Clock size={10} />
                        {course.duration}
                      </div>
                    </div>
                    <h3 className="text-white font-bold group-hover:text-brandPurple transition-colors mb-3 leading-tight">{course.title}</h3>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-textMuted font-medium">ความคืบหน้า</span>
                        <span className="text-white font-bold">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${done ? 'bg-brandGreen' : 'bg-brandPurple'}`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-1 text-brandOrange">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold text-white">{course.rating}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <button onClick={() => openEditModal(course)} className="p-2 text-gray-400 hover:text-white transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(course.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button className="flex items-center gap-2 text-sm font-bold text-brandPurple hover:text-purple-400 transition-colors group/btn ml-2">
                      {done ? "ทบทวน" : progress > 0 ? "เรียนต่อ" : "เริ่มเรียน"}
                      <PlayCircle className="group-hover/btn:translate-x-1 transition-transform" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cardDark border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">
                {editingCourse ? "แก้ไขหลักสูตร" : "เพิ่มหลักสูตรการอบรม"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ชื่อหลักสูตร</label>
                  <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="เช่น Advanced React Patterns" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">หมวดหมู่</label>
                    <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="เช่น Technical" />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ระยะเวลา (ชม.)</label>
                    <input required type="text" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="เช่น 5h 30m" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">ความคืบหน้า (%)</label>
                    <input required type="number" min="0" max="100" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.progress} onChange={(e) => setFormData({...formData, progress: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs font-semibold mb-1 uppercase">คะแนนรีวิว</label>
                    <input required type="number" step="0.1" min="0" max="5" className="w-full bg-cardDark border border-gray-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-brandPurple text-white" value={formData.rating} onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">ยกเลิก</button>
                <button type="submit" className="bg-brandPurple hover:bg-brandPurple/90 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
                  {editingCourse ? "บันทึกการแก้ไข" : "บันทึกหลักสูตร"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
