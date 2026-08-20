"use client";

import { useState } from "react";
import { useAdminTransactionsLogs } from "@/hooks/admin/useAdminTransactions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CreditCard, RefreshCcw, Building2 } from "lucide-react";
import { format } from "date-fns";
import { TransactionLog } from "@/types/billing/billing";

// Extended interface to handle the included organization name
interface AdminTransactionLog extends TransactionLog {
  organization?: {
    name: string;
  };
}

export default function AdminTransactionsTable({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const limit = 10;

  const { data, isLoading, isError, isFetching, refetch } = useAdminTransactionsLogs(
    { status: statusFilter, type: typeFilter, fromDate: fromDate || undefined, toDate: toDate || undefined },
    { page, limit },
    { sortBy, sortOrder: "desc" }
  );
  
  const logs = data?.data?.data || [];
  const meta = data?.data?.meta || { total: 0, page: 1, totalPages: 1, limit: 10 };
  
  return (
    <Card className="glass-strong border border-white/5 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/10 rounded-lg">
            <CreditCard className="w-5 h-5 text-gold" />
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
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date (Newest)</SelectItem>
              <SelectItem value="amountCents">Amount (Highest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        {isLoading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <RefreshCcw className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-destructive p-8 text-sm">
            Failed to load transactions. Please try refreshing.
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 text-center">
            <CreditCard className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">No transactions found matching your filters.</p>
            <Button
              variant="link"
              onClick={() => {
                setStatusFilter(undefined);
                setTypeFilter(undefined);
              }}
              className="mt-2 text-gold"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/10 dark:bg-white/[0.02] text-muted-foreground border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log: AdminTransactionLog) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(log.createdAt), "h:mm a")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {log.organization?.name || "Unknown"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 max-w-[120px] truncate">
                      {log.organizationId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground capitalize">
                      {log.type.replace("_", " ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                      {log.id.substring(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black/5 dark:bg-white/5 text-foreground capitalize">
                      {log.paymentProvider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        log.status === "paid"
                          ? "bg-success/10 text-success border-success/20"
                          : log.status === "failed"
                          ? "bg-danger/10 text-danger border-danger/20"
                          : "bg-gold/10 text-gold border-gold/20"
                      }`}
                    >
                      {log.status === "paid"
                        ? "Paid"
                        : log.status === "failed"
                        ? "Failed"
                        : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold text-foreground">
                      ${(log.amountCents / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 uppercase">
                      {log.currency}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/5 dark:bg-white/[0.01]">
        <div className="text-xs text-muted-foreground">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/10 bg-transparent hover:bg-white/5"
            disabled={page === 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/10 bg-transparent hover:bg-white/5"
            disabled={page >= meta.totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
