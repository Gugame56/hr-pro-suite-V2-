import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    const role = (formData.get("role") as string) || "";

    // ตรวจสอบสิทธิ์: อนุญาตเฉพาะ admin และ manager
    const normalizedRole = role.toLowerCase();
    if (normalizedRole !== "admin" && normalizedRole !== "manager") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์อัปโหลดวิดีโอ (สำหรับ Manager และ Admin เท่านั้น)" },
        { status: 403 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์วิดีโอ" }, { status: 400 });
    }

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "กรุณาอัปโหลดไฟล์ประเภทวิดีโอเท่านั้น" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ทำความสะอาดชื่อไฟล์และตั้งชื่อใหม่เพื่อป้องกันการบันทึกทับ
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;
    const uploadPath = path.join(process.cwd(), "public/uploads/training", uniqueFileName);

    await writeFile(uploadPath, buffer);

    const videoUrl = `/uploads/training/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      videoUrl,
      fileName: file.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "อัปโหลดไฟล์ล้มเหลว" },
      { status: 500 }
    );
  }
}
