"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RankedChartItem = { name: string; count: number };

type ChartLayout = {
  axisWidth: number;
  labelMax: number;
  rowHeight: number;
  fontSize: number;
  maxHeight: number;
  minHeight: number;
};

function getChartLayout(width: number): ChartLayout {
  if (width >= 1280) {
    return { axisWidth: 220, labelMax: 36, rowHeight: 42, fontSize: 13, maxHeight: 520, minHeight: 280 };
  }
  if (width >= 768) {
    return { axisWidth: 160, labelMax: 26, rowHeight: 38, fontSize: 12, maxHeight: 440, minHeight: 240 };
  }
  return { axisWidth: 104, labelMax: 16, rowHeight: 32, fontSize: 11, maxHeight: 360, minHeight: 200 };
}

function truncateLabel(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RankedChartItem & { label: string }; value: number }>;
}) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-[min(92vw,20rem)] rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-md">
      <p className="font-medium leading-snug break-words">{item.name}</p>
      <p className="mt-1 text-muted-foreground tabular-nums">{item.count} empresas</p>
    </div>
  );
}

function useChartLayout() {
  const [layout, setLayout] = useState<ChartLayout>(() =>
    typeof window !== "undefined" ? getChartLayout(window.innerWidth) : getChartLayout(1024),
  );

  useEffect(() => {
    const update = () => setLayout(getChartLayout(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return layout;
}

interface RankedBarChartProps {
  data: RankedChartItem[];
  emptyMessage?: string;
}

const CHART_FILL = "var(--primary)";

export function RankedBarChart({ data, emptyMessage = "Sin datos" }: RankedBarChartProps) {
  const layout = useChartLayout();

  const chartData = useMemo(
    () => data.map((d) => ({ ...d, label: truncateLabel(d.name, layout.labelMax) })),
    [data, layout.labelMax],
  );

  const height = useMemo(
    () =>
      Math.min(
        layout.maxHeight,
        Math.max(layout.minHeight, chartData.length * layout.rowHeight + 56),
      ),
    [chartData.length, layout],
  );

  if (!chartData.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: layout.fontSize, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={layout.axisWidth}
            tick={{ fontSize: layout.fontSize, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.45 }} />
          <Bar dataKey="count" fill={CHART_FILL} radius={[0, 6, 6, 0]} maxBarSize={layout.rowHeight - 10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
