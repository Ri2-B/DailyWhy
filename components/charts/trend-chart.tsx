"use client"
import { GlassCard } from "@/components/ui/glass-card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface DataPoint {
  name: string
  decisions: number
  success: number
}

interface TrendChartProps {
  data: DataPoint[]
  title: string
}

export function TrendChart({ data, title }: TrendChartProps) {
  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDecisions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A938A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0A938A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4DD6FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4DD6FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} />
            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10, 15, 30, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="decisions"
              stroke="#0A938A"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDecisions)"
            />
            <Area
              type="monotone"
              dataKey="success"
              stroke="#4DD6FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSuccess)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0A938A]" />
          <span className="text-sm text-muted-foreground">Decisions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4DD6FF]" />
          <span className="text-sm text-muted-foreground">Success Rate</span>
        </div>
      </div>
    </GlassCard>
  )
}
