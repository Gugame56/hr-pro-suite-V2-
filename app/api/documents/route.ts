import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { AuditService } from "@/lib/services/AuditService";

export const dynamic = "force-dynamic";

const dbPath = path.join(process.cwd(), "public", "uploads", "documents", "documents_meta.json");

const DEFAULT_DOCUMENTS = [
  {
    id: "doc_company_rules",
    title: "คู่มือและข้อบังคับการทำงานประจำปี",
    category: "ระเบียบบริษัท",
    targetType: "all",
    targetDepartment: "",
    targetEmployeeId: "",
    targetEmployeeName: "ทุกคน",
    fileName: "company-regulations-2026.pdf",
    fileUrl: "/uploads/documents/company-regulations-2026.pdf",
    fileSize: "1.25 MB",
    uploadedBy: "HR Manager",
    acknowledgedBy: [],
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "doc_pdpa_policy",
    title: "นโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA Policy)",
    category: "ระเบียบบริษัท",
    targetType: "all",
    targetDepartment: "",
    targetEmployeeId: "",
    targetEmployeeName: "ทุกคน",
    fileName: "pdpa-policy-v2.pdf",
    fileUrl: "/uploads/documents/pdpa-policy-v2.pdf",
    fileSize: "850 KB",
    uploadedBy: "Legal & Compliance",
    acknowledgedBy: [],
    createdAt: "2026-02-01T10:30:00.000Z",
  },
  {
    id: "doc_welfare_benefit",
    title: "แบบฟอร์มการเบิกสวัสดิการค่ารักษาพยาบาลและทันตกรรม",
    category: "สวัสดิการ",
    targetType: "all",
    targetDepartment: "",
    targetEmployeeId: "",
    targetEmployeeName: "ทุกคน",
    fileName: "medical-claim-form-2026.xlsx",
    fileUrl: "/uploads/documents/medical-claim-form-2026.xlsx",
    fileSize: "320 KB",
    uploadedBy: "HR Benefits",
    acknowledgedBy: [],
    createdAt: "2026-03-10T14:15:00.000Z",
  },
];

function getDocuments(): any[] {
  if (!fs.existsSync(dbPath)) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(DEFAULT_DOCUMENTS, null, 2), "utf-8");
      return DEFAULT_DOCUMENTS;
    } catch {
      return DEFAULT_DOCUMENTS;
    }
  }
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return Array.isArray(data) ? data : DEFAULT_DOCUMENTS;
  } catch {
    return DEFAULT_DOCUMENTS;
  }
}

function saveDocuments(docs: any[]) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(docs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save documents_meta.json:", err);
  }
}

// GET: ดึงรายการเอกสาร (รองรับกรองตาม employeeId, department, role)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = (searchParams.get("employeeId") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const role = (searchParams.get("role") || "employee").toLowerCase();

    const allDocs = getDocuments();

    // หากเป็น Admin / Manager / HR ให้ดูได้ทั้งหมด
    if (role === "admin" || role === "manager" || role === "hr") {
      return NextResponse.json({ success: true, documents: allDocs });
    }

    // หากเป็น Employee ทั่วไป:
    // 1. เอกสารส่วนกลาง (all)
    // 2. เอกสารประจำแผนกของผู้ใช้ (department)
    // 3. เอกสารเฉพาะบุคคล (specific)
    const filtered = allDocs.filter((doc: any) => {
      if (doc.targetType === "all") return true;
      if (doc.targetType === "department" && department && doc.targetDepartment === department) return true;
      if (doc.targetType === "specific" && employeeId && doc.targetEmployeeId === employeeId) return true;
      return false;
    });

    return NextResponse.json({ success: true, documents: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: บันทึกการรับทราบเอกสาร (Acknowledgement)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, employeeId, action } = body;

    if (!documentId || !employeeId) {
      return NextResponse.json({ error: "ต้องระบุ documentId และ employeeId" }, { status: 400 });
    }

    const allDocs = getDocuments();
    const doc = allDocs.find((d: any) => d.id === documentId);
    if (!doc) {
      return NextResponse.json({ error: "ไม่พบเอกสารนี้" }, { status: 404 });
    }

    if (action === "acknowledge") {
      const ackList = Array.isArray(doc.acknowledgedBy) ? doc.acknowledgedBy : [];
      if (!ackList.includes(employeeId)) {
        ackList.push(employeeId);
        doc.acknowledgedBy = ackList;
        saveDocuments(allDocs);

        AuditService.getInstance().log({
          actor: employeeId,
          action: "ACKNOWLEDGE_DOCUMENT",
          entity: "Documents",
          entityId: documentId,
          changes: { title: doc.title },
        });
      }
    }

    return NextResponse.json({ success: true, acknowledged: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: ลบเอกสาร (เฉพาะ Admin/Manager/HR)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const actor = searchParams.get("actor") || "Admin";

    if (!id) {
      return NextResponse.json({ error: "ต้องระบุ Document ID" }, { status: 400 });
    }

    const allDocs = getDocuments();
    const docToDelete = allDocs.find((d: any) => d.id === id);

    if (docToDelete && docToDelete.fileUrl) {
      const filePath = path.join(process.cwd(), "public", docToDelete.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete physical file:", e);
        }
      }

      AuditService.getInstance().log({
        actor,
        action: "DELETE_DOCUMENT",
        entity: "Documents",
        entityId: id,
        changes: { title: docToDelete.title, fileName: docToDelete.fileName },
      });
    }

    const remaining = allDocs.filter((d: any) => d.id !== id);
    saveDocuments(remaining);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
