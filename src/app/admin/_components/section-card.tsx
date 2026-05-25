import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, action, children }: Props) {
  return (
    <div className="v2-acard">
      <div className="v2-acard-head">
        <h2 className="v2-acard-title">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
