import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MeetingRowActions } from "./MeetingAction";
import { useAuthStore } from "@/store/auth/auth.store";
function getProviderLabel(providerKey: string) {
  return providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
}

export function MeetingsList({
  data,
  isLoading,
  emptyLabel,
  badgeFallback,
  isLive = false,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  pageNumber,
  connectionId,
  providerKey,
  onChanged,
}: {
  data: any;
  isLoading: boolean;
  emptyLabel: string;
  badgeFallback: string;
  isLive?: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageNumber: number;
  /** Optional — when provided alongside providerKey + onChanged, row actions (edit/registrants/delete) render */
  connectionId?: string;
  providerKey?: string;
  onChanged?: () => void;
}) {
  const meetingsList = data?.resources || [];
  const { user } = useAuthStore();
  console.log(user)
  return (
    <div className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            {isLive ? "Live Meetings" : "Scheduled Meetings"}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {data?.resourcesFound ?? meetingsList.length} meeting(s) found
          </p>
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-1", isLoading && "opacity-50 pointer-events-none")}>
        {meetingsList.length > 0 ? (
          meetingsList.map((m: any) => {
            const startTime = m.metadata?.start_time ? new Date(m.metadata.start_time) : null;

            return (
              <div
                key={m.externalResourceId || m.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-4 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[14px] font-semibold text-foreground">
                      {m.name || "Untitled Meeting"}
                    </div>
                    <span className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                      isLive
                        ? "bg-[color:var(--success)]/10 text-[color:var(--success)] border-[color:var(--success)]/20"
                        : "bg-[color:var(--gold-soft)]/10 text-[color:var(--gold-soft)] border-[color:var(--gold-soft)]/20"
                    )}>
                      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)] animate-pulse" />}
                      {m.metadata?.duration ? `${m.metadata.duration} min` : badgeFallback}
                    </span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">
                    ID: <span className="font-mono text-[11px]">{m.externalResourceId}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right text-[11.5px] text-muted-foreground">
                    {startTime ? (
                      <>
                        <span className="block font-medium text-foreground">
                          {formatDistanceToNow(startTime, { addSuffix: true })}
                        </span>
                        <span className="block text-[10.5px] opacity-80">
                          {startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : (
                      'No start time'
                    )}
                  </div>

                  {m.metadata?.join_url && (
                    <a
                      href={m.metadata.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
                    >
                      <span>Join</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}

                  {connectionId && providerKey && onChanged && (
                    <MeetingRowActions
                      connectionId={connectionId}
                      providerKey={providerKey}
                      meetingId={m.externalResourceId || m.id}
                      initial={{
                        topic: m.name,
                        startTime: m.metadata?.start_time,
                        durationMinutes: m.metadata?.duration,
                        timezone: m.metadata?.timezone,
                      }}
                      onChanged={onChanged}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 text-center text-[13px] text-muted-foreground py-8">
            {isLoading ? "Loading…" : emptyLabel}
          </div>
        )}
      </div>

      {(hasPrevious || hasNext) && (
        <div className="mt-4 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-4">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious || isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="text-[11.5px] text-muted-foreground">Page {pageNumber}</span>
          <button
            onClick={onNext}
            disabled={!hasNext || isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export { getProviderLabel };