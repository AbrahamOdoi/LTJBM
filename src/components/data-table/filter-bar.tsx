import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Extra actions to the right of the submit button (e.g. clear link). */
  actions?: ReactNode;
  submitLabel?: string;
  className?: string;
};

/**
 * GET filter form that writes query params on submit (shareable / refresh-safe).
 * Place named inputs as children; page/pageSize are reset via hidden page=1.
 */
export function DataTableFilterBar({
  children,
  actions,
  submitLabel = "Filter",
  className,
}: Props) {
  return (
    <form method="get" className="print:hidden">
      <input type="hidden" name="page" value="1" />
      <div
        className={`lt-panel grid gap-3 p-4 ${className ?? ""}`.trim()}
      >
        {children}
        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="lt-btn-primary">
            {submitLabel}
          </button>
          {actions}
        </div>
      </div>
    </form>
  );
}
