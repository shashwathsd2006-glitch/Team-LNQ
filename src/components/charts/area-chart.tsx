"use client";

import * as React from "react";

interface AreaChartProps {
  data: number[];
  height?: number;
  className?: string;
  accent?: string;
  fillOpacity?: number;
  labels?: string[];
}

export function AreaChart({
  data,
  height = 160,
  className,
  accent = "#38bdf8",
  fillOpacity = 0.15,
  labels,
}: AreaChartProps) {
  const width = 600;
  const padding = 8;
  const max = Math.max(...data) * 1.15;
  const min = 0;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - ((v - min) / (max - min)) * (height - padding * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${height - padding} L ${points[0][0].toFixed(1)} ${height - padding} Z`;

  const gradientId = React.useId();

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padding}
            x2={width - padding}
            y1={height * f}
            y2={height * f}
            stroke="#1a2028"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="2" fill={accent} />
            {labels && labels[i] && (
              <text x={x} y={height} fill="#5c6472" fontSize="8" textAnchor="middle">
                {labels[i]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
