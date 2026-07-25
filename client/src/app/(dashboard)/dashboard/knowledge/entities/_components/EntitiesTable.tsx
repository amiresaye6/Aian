"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Search, BrainCircuit, Users, Building, Code, Hash, Link as LinkIcon, Briefcase } from "lucide-react";
import { ResolvedEntity, PaginatedEntitiesResponse } from "@/types/entities";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EntitiesTableProps {
  entities?: ResolvedEntity[];
  meta?: PaginatedEntitiesResponse["meta"];
  isLoading: boolean;
  onSelectEntity: (id: string) => void;
  selectedEntityId?: string;
  selectedType: string;
  setSelectedType: (type: string) => void;
  page: number;
  setPage: (page: number | ((p: number) => number)) => void;
}

export function EntitiesTable({ 
  entities, 
  meta = { total: 0, page: 1, totalPages: 1, limit: 10 }, 
  isLoading, 
  onSelectEntity, 
  selectedEntityId,
  selectedType,
  setSelectedType,
  page,
  setPage
}: EntitiesTableProps) {
  
  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person': return <Users className="w-3.5 h-3.5 text-blue-400" />;
      case 'company': return <Building className="w-3.5 h-3.5 text-indigo-400" />;
      case 'project': return <Briefcase className="w-3.5 h-3.5 text-purple-400" />;
      case 'system': return <Code className="w-3.5 h-3.5 text-teal-400" />;
      case 'api': return <LinkIcon className="w-3.5 h-3.5 text-orange-400" />;
      case 'feature': return <BrainCircuit className="w-3.5 h-3.5 text-gold" />;
      default: return <Hash className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person': return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case 'company': return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case 'project': return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case 'system': return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case 'api': return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case 'feature': return "bg-gold/10 text-gold border-gold/20";
      default: return "bg-white/5 text-muted-foreground border-white/10";
    }
  };

  return (
    <Card className="glass overflow-hidden flex flex-col h-full border-white/5">
      {/* Premium Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <BrainCircuit className="w-5 h-5 text-gold-soft drop-shadow-[0_0_5px_rgba(201,152,43,0.8)]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Resolved Entities</h3>
            <p className="text-xs text-muted-foreground">Showing {meta.total} total entities</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select 
            value={selectedType} 
            onValueChange={(val) => {
              setSelectedType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Person">Person</SelectItem>
              <SelectItem value="System">System</SelectItem>
              <SelectItem value="Project">Project</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="Feature">Feature</SelectItem>
              <SelectItem value="Database">Database</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Entity</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Confidence</th>
              <th className="px-6 py-4 font-medium">Mentions</th>
              <th className="px-6 py-4 font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-2 w-24 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))
            ) : entities?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm">No entities found in the graph.</p>
                  </div>
                </td>
              </tr>
            ) : (
              entities?.map((entity) => (
                <tr 
                  key={entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className={`group cursor-pointer transition-all duration-200 hover:bg-white/[0.03] ${
                    selectedEntityId === entity.id ? "bg-white/[0.04] relative" : ""
                  }`}
                >
                  {/* Left accent bar for selected row */}
                  {selectedEntityId === entity.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[color:var(--gold)] shadow-[0_0_10px_var(--gold)]" />
                  )}
                  
                  {/* Entity Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        {getEntityIcon(entity.type)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground group-hover:text-[color:var(--gold)] transition-colors">
                          {entity.canonicalName}
                        </span>
                        {entity.aliases.length > 1 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{entity.aliases.length - 1} known aliases
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Type Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm ${getTypeColor(entity.type)}`}>
                      {entity.type}
                    </Badge>
                  </td>

                  {/* Confidence Column */}
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-green-400 rounded-full"
                          style={{ width: `${Math.round(entity.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    </div>
                  </td>

                  {/* Mentions Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-foreground">
                      {entity._count?.mentions || 0}
                    </span>
                  </td>

                  {/* Last Seen Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entity.lastSeenAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <span className="text-xs text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1}
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p: number) => Math.min(meta.totalPages, p + 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
