"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DashboardIntegration } from "@/types/dashboard";
import { Network } from "lucide-react";

export function KnowledgeDistributionChart({ 
  integrations, 
  eyes 
}: { 
  integrations: DashboardIntegration[],
  eyes: any[]
}) {
  // Aggregate knowledge items by provider
  const dataMap = integrations.reduce((acc, curr) => {
    const eye = eyes.find(e => e.id === curr.organizationEyeId);
    const providerName = eye?.providerName || eye?.eyeTypeName || curr.externalAccountName || "Unknown";
    const displayLabel = providerName.charAt(0).toUpperCase() + providerName.slice(1);
    
    acc[displayLabel] = (acc[displayLabel] || 0) + curr.knowledgeItems;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap)
    .map(key => ({ name: key, value: dataMap[key] }))
    .filter(item => item.value > 0);

  const COLORS = ["#15C2A7", "#C9982B", "#6530F4", "#F43059", "#30A0F4"];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-[color:var(--gold-soft)]">
          <Network className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm font-medium">Knowledge Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No knowledge items found.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#111' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
