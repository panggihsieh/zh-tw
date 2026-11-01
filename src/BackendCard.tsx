import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function BackendCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="backend-function-card">
      <summary>
        <span>
          <strong>{title}</strong>
          <span>{description}</span>
        </span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="backend-function-content">{children}</div>
    </details>
  );
}
