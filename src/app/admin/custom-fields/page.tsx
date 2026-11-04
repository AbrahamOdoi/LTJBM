import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/admin/app-shell";
import { CustomFieldAdminForms } from "@/components/admin/custom-field-forms";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/roles";
import { listCustomFieldDefinitions } from "@/lib/custom-fields/service";

export default async function AdminCustomFieldsPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const fields = await listCustomFieldDefinitions({ activeOnly: false });

  return (
    <AdminAppShell
      title="Custom fields"
      subtitle="Freeform per-member fields beyond domain dropdowns (occupation notes, allergies, preferred language, and similar)."
      userName={session.user.name}
    >
      <CustomFieldAdminForms fields={fields} />
    </AdminAppShell>
  );
}
