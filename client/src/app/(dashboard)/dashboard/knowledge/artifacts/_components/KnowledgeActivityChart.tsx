"use client";

import useSWR from "swr";
import { knowledgeApi } from "@/api/knowledge/knowledge.api";
import { getConnections } from "@/api/integrations";
import { ArtifactActivity } from "@/types/knowledge";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

async function fetchAggregatedActivity(orgId: string): Promise<ArtifactActivity[]> {
  // 1. Fetch all connections
  const connections = await getConnections(orgId);
  if (!connections || connections.length === 0) return [];

  // 2. Fetch activity for each connection in parallel
  const validConnections = connections.filter((c: any) => c.connectionId);
  if (validConnections.length === 0) return [];

  const activitiesPromises = validConnections.map((conn: any) =>
    knowledgeApi.getKnowledgeActivity(conn.connectionId).catch(() => [])
  );
  const results = await Promise.all(activitiesPromises);

  // 3. Aggregate counts by date
  const dateMap: Record<string, number> = {};
  results.forEach((activityArray: any) => {
    activityArray.forEach((item: ArtifactActivity) => {
      dateMap[item.date] = (dateMap[item.date] || 0) + item.count;
    });
  });

  // 4. Sort and return
  const sortedDates = Object.keys(dateMap).sort();
  return sortedDates.map((date) => ({
    date,
    count: dateMap[date],
  }));
}

export function KnowledgeActivityChart({ organizationId }: { organizationId: string }) {
  const { data: chartData, isLoading } = useSWR(
    organizationId ? `/api/knowledge/aggregated-activity/${organizationId}` : null,
    () => fetchAggregatedActivity(organizationId)
  );

  const totalVolume = chartData?.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <Card className="glass-strong relative overflow-hidden border border-white/5 p-6 md:p-8">
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-[color:var(--gold)]" />
            30-Day Extraction Volume
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Total AI-assembled artifacts across all integrations
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-xl px-6 py-3 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">Total Processed</span>
          <span className="text-2xl font-bold text-foreground mt-0.5">
            {isLoading ? "..." : totalVolume.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="h-[280px] w-full relative z-10">
        {isLoading ? (
          <div className="w-full h-full animate-pulse-soft bg-white/5 rounded-lg" />
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(dateStr) => format(parseISO(dateStr), "MMM d")}
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis 
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "var(--card)", 
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
                }}
                labelFormatter={(label) => format(parseISO(label as string), "MMMM d, yyyy")}
                formatter={(value: any) => [value?.toLocaleString() || "0", "Items"]}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="var(--gold)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed border-white/10 rounded-lg">
            <Activity className="h-8 w-8 opacity-20 mb-2" />
            <p>No extraction activity in the last 30 days.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
