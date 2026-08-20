"use client";

import { useState } from "react";
import { useTransactionsLogs } from "@/hooks/billing/useTransactions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CreditCard, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { TransactionLog } from "@/types/billing/billing";

export default function TransactionsLogsTable({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const limit = 10;

  const { data, isLoading, isError, isFetching, refetch } = useTransactionsLogs(
    { status: statusFilter, type: typeFilter, fromDate: fromDate || undefined, toDate: toDate || undefined },
    { page, limit },
    { sortBy, sortOrder: "desc" }
  );
  
  const logs = data?.data.data || [];
  const meta = data?.data.meta || { total: 0, page: 1, totalPages: 1, limit: 10 };
  
  return (
    <Card className="glass-strong border border-white/5 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Transaction History</h3>
            <p className="text-xs text-muted-foreground">Showing {meta.total} total transactions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isFetching}
            className="border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCcw
              className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>

          <Select
            value={statusFilter || "all"}
            onValueChange={(val) => {
              setStatusFilter(val === "all" ? undefined : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={typeFilter || "all"}
            onValueChange={(val) => {
              setTypeFilter(val === "all" ? undefined : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="overage">Overage</SelectItem>
              <SelectItem value="upgrade_proration">Proration</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date (Newest)</SelectItem>
              <SelectItem value="amountCents">Amount (Highest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium">Date & Time</th>
              <th className="px-6 py-4 font-medium">Description (Type)</th>
              <th className="px-6 py-4 font-medium">Provider</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-6 w-full animate-pulse-soft bg-white/5 rounded" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-red-500/80">
                  Failed to load transaction logs.
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log: TransactionLog) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/[0.02] hover:-translate-y-[1px] transition-all"
                >
                  <td className="px-6 py-4 text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-6 py-4 capitalize text-sm text-foreground">
                    {log.type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-4 capitalize text-xs text-muted-foreground">
                    {log.paymentProvider}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === "paid" ? "bg-green-500/10 text-green-500" :
                      log.status === "failed" ? "bg-red-500/10 text-red-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-foreground tracking-wide">
                      ${(log.amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">{log.currency}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No transactions found matching your filters.
                </td>
              </tr>
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
            disabled={page === 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages || isLoading}
            onClick={() => setPage(p => p + 1)}
            className="h-8 border-white/10 bg-transparent text-foreground hover:bg-white/5"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
