"use client";

import { useEffect, useState } from "react";
import { canManage } from "./permissions";

// Client hook: reads the signed-in user's role from the `hr_session` localStorage
// entry and reports whether they may create/edit/delete managed (setup) data.
//
// Pages use it to hide "เพิ่ม / แก้ไข / ลบ" controls from employees:
//
//   const canEdit = useCanManage();
//   {canEdit && <button onClick={openAddModal}>เพิ่ม</button>}
//
// Starts `false` so management controls never flash for an employee before the
// session is read on mount.
export function useCanManage(): boolean {
  const [can, setCan] = useState(false);

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("hr_session") || "{}");
      setCan(canManage(session.role));
    } catch {
      setCan(false);
    }
  }, []);

  return can;
}
