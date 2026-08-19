"use client";

import { useState } from "react";
import { useTransactionsSummary } from "@/hooks/billing/useTransactions";
import TransactionsSummaryCards from "./TransactionsSummaryCards";
import TransactionsLogsTable from "./TransactionsLogsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

export default function TransactionsTab() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const { data, isLoading, isError, error } = useTransactionsSummary({
    fromDate: date?.from?.toISOString(),
    toDate: date?.to?.toISOString(),
  });

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Transactions</AlertTitle>
        <AlertDescription>
          {error?.message || "Failed to load transaction data."}
        </AlertDescription>
      </Alert>
    );
  }

  const defaultSummary = {
    totalPayments: 0,
    totalSuccessfulAmount: 0,
    totalSuccessfulCount: 0,
    totalFailedCount: 0,
    totalPendingCount: 0,
  };

  const summaryData = data?.data || defaultSummary;

  return (
    <div className="space-y-6">
      
      {/* Date Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl glass-strong border border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <CalendarIcon className="w-4 h-4 text-blue-400" />
          Transaction Period
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(date?.from || date?.to) && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setDate({ from: undefined, to: undefined })}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <TransactionsSummaryCards summary={summaryData} isLoading={isLoading} />
      <TransactionsLogsTable fromDate={date?.from?.toISOString()} toDate={date?.to?.toISOString()} />
    </div>
  );
}
