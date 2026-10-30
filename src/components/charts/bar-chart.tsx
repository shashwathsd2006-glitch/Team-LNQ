"use client";

interface BarChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  variant?: "cyan" | "amber" | "green";
}

const variants = {
  cyan: "#38bdf8",
  amber: "#f5a524",
  green: "#34d399",
};

export function BarChart({ data, labels, height = 140, variant = "cyan" }: BarChartProps) {
  const color = variants[variant];
  const max = Math.max(...data);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
            <div className="relative flex w-full flex-1 items-end">
              <div className="flex w-full items-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t-[3px] transition-all duration-300 group-hover:opacity-80"
                  style={{ height: `${h}%`, background: `linear-gradient(180deg, ${color}aa, ${color}22)` }}
                />
              </div>
            </div>
            {labels && <span className="text-[9px] text-subtle">{labels[i]}</span>}
          </div>
        );
      })}
    </div>
  );
}
