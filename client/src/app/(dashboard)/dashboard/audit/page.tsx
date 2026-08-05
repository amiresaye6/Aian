"use client";

import { useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/api/audit/audit.api";
import { AuditTable } from "./_components/AuditTable";
import { AuditAnalyticsCards } from "./_components/AuditAnalytics";
import { AuditDetailsSheet } from "./_components/AuditDetailsSheet";
import { RefreshCcw, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function AuditPage() {
  const [selectedSkill, setSelectedSkill] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Parse the boolean status correctly for the API
  const successParam = selectedStatus === "All" ? undefined : selectedStatus === "true";

  const { data: logsResponse, isLoading: isLoadingLogs, isFetching: isFetchingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["audit-logs", selectedSkill, successParam, page],
    queryFn: () => auditApi.getAuditLogs({
      page,
      limit: 10,
      skill: selectedSkill === "All" ? undefined : selectedSkill,
      success: successParam,
      dateFrom: date?.from?.toISOString(),
      dateTo: date?.to?.toISOString(),
    }),
  });

  const { data: analytics, isLoading: isLoadingAnalytics, isFetching: isFetchingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["audit-analytics"],
    queryFn: () => auditApi.getAnalytics(),
  });

  const isAnyLoading = isLoadingLogs || isLoadingAnalytics || isFetchingLogs || isFetchingAnalytics;

  const handleRefresh = () => {
    refetchLogs();
    refetchAnalytics();
  };

  const selectedLog = logsResponse?.data?.find(log => log.id === selectedLogId);

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5 flex-1">
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Audit Log
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Track and trace all system actions across your workspace. Monitor skill usage, failures, and actor attribution in real-time.
            </p>
          </div>
          
          {/* Date Filter & Refresh */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Filter by date...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setPage(1);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {(date?.from || date?.to) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setDate({ from: undefined, to: undefined });
                    setPage(1);
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="border-white/10 bg-white/5 hover:bg-white/10"
              disabled={isAnyLoading}
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isAnyLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Analytics Overview */}
        <AuditAnalyticsCards 
          analytics={analytics} 
          isLoading={isLoadingAnalytics || isFetchingAnalytics} 
        />

        {/* Main Table */}
        <div className="flex-1 min-h-[500px]">
          <AuditTable
            logs={logsResponse?.data}
            meta={logsResponse?.meta}
            isLoading={isLoadingLogs || isFetchingLogs}
            onSelectLog={setSelectedLogId}
            selectedLogId={selectedLogId || undefined}
            selectedSkill={selectedSkill}
            setSelectedSkill={setSelectedSkill}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            page={page}
            setPage={setPage}
          />
        </div>

        {/* Details Sheet */}
        <AuditDetailsSheet 
          log={selectedLog}
          onClose={() => setSelectedLogId(null)}
        />
        
      </div>
    </AppLayout>
  );
}
