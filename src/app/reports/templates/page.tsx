import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TemplateEditor } from "@/components/reporting/template-editor";
import { ensureDefaultBoardTemplate } from "@/lib/reporting/service";
import { canEditReportTemplates } from "@/lib/roles";

export default async function ReportTemplatesPage() {
  const session = await auth();
  if (!canEditReportTemplates(session?.user?.role)) {
    redirect("/forbidden?reason=reporting");
  }

  const template = await ensureDefaultBoardTemplate();

  return (
    <TemplateEditor templateId={template.id} initialLayout={template.layout} />
  );
}
