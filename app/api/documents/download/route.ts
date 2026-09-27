import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { readFile } from "fs/promises";
import { AuditService } from "@/lib/services/AuditService";

export const dynamic = "force-dynamic";

const dbPath = path.join(process.cwd(), "public", "uploads", "documents", "documents_meta.json");

function getDocuments(): any[] {
  if (!fs.existsSync(dbPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const employeeId = (searchParams.get("employeeId") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const role = (searchParams.get("role") || "employee").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "ต้องระบุ Document ID" }, { status: 400 });
    }

    const allDocs = getDocuments();
    const doc = allDocs.find((d: any) => d.id === id);

    if (!doc) {
      return NextResponse.json({ error: "ไม่พบเอกสารนี้ในระบบ" }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์การเข้าถึงไฟล์ (Authorization & PDPA check)
    const canAccess =
      role === "admin" ||
      role === "manager" ||
      role === "hr" ||
      doc.targetType === "all" ||
      (doc.targetType === "department" && department && doc.targetDepartment === department) ||
      (doc.targetType === "specific" && employeeId && doc.targetEmployeeId === employeeId);

    if (!canAccess) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงหรือดาวน์โหลดเอกสารนี้" },
        { status: 403 }
      );
    }

    // บันทึก Audit Log การดาวน์โหลด
    AuditService.getInstance().log({
      actor: employeeId || role,
      action: "DOWNLOAD_DOCUMENT",
      entity: "Documents",
      entityId: doc.id,
      changes: { title: doc.title, fileName: doc.fileName },
    });

    const filePath = path.join(process.cwd(), "public", doc.fileUrl);

    if (!fs.existsSync(filePath)) {
      // หากไฟล์ตัวอย่างจำลอง ให้ redirect หรือส่งข้อความ
      return NextResponse.json({
        error: "ไฟล์เอกสารตัวอย่าง (ยังไม่มีไฟล์อัปโหลดจริงบนดิสก์)",
        fileName: doc.fileName,
      }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(doc.fileName).toLowerCase();

    const contentTypeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".zip": "application/zip",
      ".txt": "text/plain; charset=utf-8",
      ".csv": "text/csv; charset=utf-8",
    };

    const contentType = contentTypeMap[ext] || "application/octet-stream";
    const encodedFileName = encodeURIComponent(doc.fileName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
