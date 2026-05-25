import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/shared/icon";
import { Sparkline } from "./sparkline";

type Tone = "pos" | "neg" | "flat";

type Props = {
  eyebrow: string;
  icon: IconName;
  value: ReactNode;
  unit?: string;
  delta?: { tone: Tone; label: string } | null;
  note?: string;
  dark?: boolean;
  spark?: number[];
  sparkStroke?: string;
};

export function KpiCard({
  eyebrow,
  icon,
  value,
  unit,
  delta,
  note,
  dark,
  spark,
  sparkStroke = "#1CAAE2",
}: Props) {
  return (
    <div className={`v2-akpi ${dark ? "dark" : ""}`}>
      <div className="v2-akpi-eye">
        <span className="ico">
          <Icon name={icon} size={12} />
        </span>
        {eyebrow}
      </div>
      <div className="v2-akpi-num">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      <div className="v2-akpi-meta">
        {delta ? (
          <span className={`v2-akpi-delta ${delta.tone === "neg" ? "neg" : delta.tone === "flat" ? "flat" : ""}`}>
            {delta.label}
          </span>
        ) : null}
        {note ? <span className="v2-akpi-note">{note}</span> : null}
      </div>
      {spark && spark.length > 1 ? (
        <div className="v2-akpi-spark">
          <Sparkline
            data={spark}
            stroke={sparkStroke}
            fill={
              dark
                ? "rgba(28, 170, 226, 0.22)"
                : "rgba(28, 170, 226, 0.14)"
            }
          />
        </div>
      ) : null}
    </div>
  );
}
