import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import { AuditService } from "@/lib/services/AuditService";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".zip",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string || "").trim();
    const category = (formData.get("category") as string) || "ทั่วไป";
    const targetType = (formData.get("targetType") as string) || "all"; // "all" | "department" | "specific"
    const targetDepartment = (formData.get("targetDepartment") as string) || "";
    const targetEmployeeId = (formData.get("targetEmployeeId") as string) || "";
    const targetEmployeeName = (formData.get("targetEmployeeName") as string) || "";
    const uploadedBy = (formData.get("uploadedBy") as string) || "Admin";

    if (!file || !title) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อเอกสารและเลือกไฟล์" },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 25 MB)" },
        { status: 400 }
      );
    }

    // ตรวจสอบนามสกุลไฟล์
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `ไม่อนุญาตให้อัปโหลดไฟล์นามสกุล ${ext || "นี้"} (รองรับเฉพาะ PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP)` },
        { status: 400 }
      );
    }

    // กำหนดโฟลเดอร์ปลายทาง
    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // ignore
    }

    // สุ่มชื่อไฟล์เพื่อไม่ให้ชื่อซ้ำกัน
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    // บันทึกไฟล์ลง Storage (ดัก EROFS ในกรณี deploy Vercel serverless)
    try {
      await writeFile(filePath, buffer);
    } catch (fsErr: any) {
      if (fsErr.code === "EROFS" || fsErr.message?.includes("read-only")) {
        console.warn("Vercel read-only filesystem detected for documents upload");
      } else {
        throw fsErr;
      }
    }

    const fileUrl = `/uploads/documents/${safeFileName}`;
    const fileSizeFormatted = file.size < 1024 * 1024
      ? (file.size / 1024).toFixed(1) + " KB"
      : (file.size / (1024 * 1024)).toFixed(2) + " MB";

    const newDoc = {
      id: "doc_" + Date.now(),
      title,
      category,
      targetType,
      targetDepartment: targetType === "department" ? targetDepartment : "",
      targetEmployeeId: targetType === "specific" ? targetEmployeeId : "",
      targetEmployeeName: targetType === "all" ? "ทุกคน" : targetType === "department" ? `แผนก ${targetDepartment}` : targetEmployeeName,
      fileName: file.name,
      fileUrl,
      fileSize: fileSizeFormatted,
      uploadedBy,
      acknowledgedBy: [] as string[],
      createdAt: new Date().toISOString(),
    };

    // บันทึกลงในไฟล์ JSON Metadata
    const dbPath = path.join(uploadDir, "documents_meta.json");
    let docs = [];
    if (fs.existsSync(dbPath)) {
      try {
        const content = fs.readFileSync(dbPath, "utf-8");
        docs = JSON.parse(content);
      } catch {
        docs = [];
      }
    }
    docs.unshift(newDoc);

    try {
      fs.writeFileSync(dbPath, JSON.stringify(docs, null, 2), "utf-8");
    } catch (writeMetaErr) {
      console.warn("Could not write documents_meta.json:", writeMetaErr);
    }

    // บันทึก Audit Log
    AuditService.getInstance().log({
      actor: uploadedBy,
      action: "UPLOAD_DOCUMENT",
      entity: "Documents",
      entityId: newDoc.id,
      changes: { title: newDoc.title, fileName: newDoc.fileName, targetType: newDoc.targetType },
    });

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  } catch (error: any) {
    console.error("Upload document error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์: " + (error.message || "ไม่สามารถอัปโหลดได้") },
      { status: 500 }
    );
  }
}
