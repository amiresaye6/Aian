"use client";

import { useAdminOrganizations } from "@/hooks/admin/useAdmin";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Building2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminUpdateOrganizationStatus } from "@/hooks/admin/useAdmin";

export default function OrganizationsPage() {
  const { data: orgsData, isLoading } = useAdminOrganizations();
  const updateStatus = useAdminUpdateOrganizationStatus();
  
  if (isLoading) {
    return <Skeleton className="h-100 w-full" />;
  }

  const orgs = orgsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-1">Manage workspaces on the platform.</p>
        </div>
      </div>

      <Card className="glass-strong border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">All Organizations</h3>
              <p className="text-xs text-muted-foreground">{orgs.length} total workspaces</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/2 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Members</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orgs.map((org: any) => (
                <tr key={org.id} className="hover:bg-white/2 hover:-translate-y-px transition-all">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{org.name}</div>
                    <div className="text-xs text-muted-foreground">{org.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      org.status === 'active' ? 'bg-success/10 text-success border-success/20' : 
                      org.status === 'suspended' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                      'bg-warning/10 text-warning border-warning/20'
                    }>
                      {org.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {org.subscription?.plan?.name || "Free Tier"}
                  </td>
                  <td className="px-6 py-4">
                    {org._count?.users || 0}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                    {format(new Date(org.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 border-white/10">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                        {org.status !== 'active' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: org.id, status: 'active' })}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        {org.status !== 'suspended' && (
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={() => updateStatus.mutate({ id: org.id, status: 'suspended' })}>
                            Suspend
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
