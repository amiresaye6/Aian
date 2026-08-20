"use client";

import { useState } from "react";
import AdminTransactionsSummaryCards from "./_components/AdminTransactionsSummaryCards";
import AdminTransactionsTable from "./_components/AdminTransactionsTable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export default function AdminTransactionsPage() {
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const fromDate = date?.from ? format(date.from, "yyyy-MM-dd") : undefined;
  const toDate = date?.to ? format(date.to, "yyyy-MM-dd") : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Global Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage payments across all organizations on the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[260px] justify-start text-left font-normal bg-white/5 border-white/10 text-foreground hover:bg-white/10 hover:text-foreground",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gold" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Filter by date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-white/10 bg-background" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                className="text-foreground"
              />
            </PopoverContent>
          </Popover>
          {date && (
            <Button
              variant="ghost"
              onClick={() => setDate(undefined)}
              className="text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <AdminTransactionsSummaryCards fromDate={fromDate} toDate={toDate} />
      <AdminTransactionsTable fromDate={fromDate} toDate={toDate} />
    </div>
  );
}
