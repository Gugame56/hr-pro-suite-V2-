import { NextRequest, NextResponse } from "next/server";

// Mock Data จำลองฐานข้อมูล (สามารถเปลี่ยนเป็นเชื่อมต่อฐานข้อมูลจริง เช่น PostgreSQL/Prisma/Supabase ได้)
let trainings = [
  {
    id: "trn-1",
    title: "ความปลอดภัยในการทำงานและสุขอนามัยเบื้องต้น",
    description: "หลักสูตรมาตรฐานความปลอดภัยและการปฏิบัติตนในสถานที่ทำงาน",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: "10 นาที",
    createdByRole: "admin",
    createdAt: new Date().toISOString(),
  },
];

// เก็บความคืบหน้ารายบุคคล: { [`${userId}_${trainingId}`]: progressNumber }
let userProgress: Record<string, number> = {};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || "default_user";

  const list = trainings.map((item) => {
    const progress = userProgress[`${userId}_${item.id}`] || 0;
    return {
      ...item,
      progress,
      isCompleted: progress >= 100,
    };
  });

  return NextResponse.json({ trainings: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, videoUrl, duration, role } = body;

    // ตรวจสอบสิทธิ์ฝั่ง Backend
    const normalizedRole = (role || "").toLowerCase();
    if (normalizedRole !== "admin" && normalizedRole !== "manager") {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์สร้างหลักสูตร" },
        { status: 403 }
      );
    }

    if (!title || !videoUrl) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อหลักสูตรและไฟล์วิดีโอ" },
        { status: 400 }
      );
    }

    const newTraining = {
      id: `trn-${Date.now()}`,
      title,
      description: description || "",
      videoUrl,
      duration: duration || "ไม่ระบุ",
      createdByRole: normalizedRole,
      createdAt: new Date().toISOString(),
    };

    trainings.unshift(newTraining);

    return NextResponse.json({ success: true, training: newTraining });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, trainingId, progress } = await req.json();

    if (!trainingId) {
      return NextResponse.json({ error: "ไม่พบ trainingId" }, { status: 400 });
    }

    const effectiveUserId = userId || "default_user";
    const currentProgress = userProgress[`${effectiveUserId}_${trainingId}`] || 0;

    // อัปเดตเฉพาะเปอร์เซ็นต์ที่สูงขึ้นเท่านั้น เพื่อป้องกันปัญหากดย้อนหลังแล้วค่าลดลง
    const newProgress = Math.min(100, Math.max(currentProgress, Math.round(progress)));
    userProgress[`${effectiveUserId}_${trainingId}`] = newProgress;

    return NextResponse.json({
      success: true,
      progress: newProgress,
      isCompleted: newProgress >= 100,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
