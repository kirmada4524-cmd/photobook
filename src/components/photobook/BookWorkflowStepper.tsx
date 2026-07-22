import { Check, ImagePlus, LayoutTemplate, Pencil, ScanEye, Sparkles } from "lucide-react";

export type BookWorkflowStage = "templates" | "photos" | "draft" | "edit" | "preview" | "export";

const WORKFLOW_STEPS = [
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "photos", label: "Photos", icon: ImagePlus },
  { id: "draft", label: "First draft", icon: Sparkles },
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "preview", label: "Preview", icon: ScanEye },
  { id: "export", label: "Export", icon: Check },
] as const;

export function BookWorkflowStepper({
  current,
  className = "",
  compact = false,
}: {
  current: BookWorkflowStage;
  className?: string;
  compact?: boolean;
}) {
  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.id === current);

  return (
    <nav
      className={`book-workflow ${compact ? "is-compact" : ""} ${className}`}
      aria-label="Book creation progress"
    >
      <ol>
        {WORKFLOW_STEPS.map((step, index) => {
          const Icon = step.icon;
          const complete = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.id}
              className={`${complete ? "is-complete" : ""} ${active ? "is-current" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="book-workflow-icon" aria-hidden="true">
                {complete ? <Check /> : <Icon />}
              </span>
              <span className="book-workflow-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
