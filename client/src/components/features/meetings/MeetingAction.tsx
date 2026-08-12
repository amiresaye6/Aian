"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, UserPlus, X, Loader2 } from "lucide-react";
import {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  addRegistrants,
} from "@/api/integrations";

function inputCls() {
  return "w-full rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-3 py-2 text-[13px] text-foreground outline-none focus:border-[color:var(--gold-soft)]/50 transition-colors";
}

function labelCls() {
  return "block mb-1 text-[11.5px] font-medium text-muted-foreground";
}

/** Small pill-style attendee editor (comma separated emails, kept minimal) */
function AttendeesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [raw, setRaw] = useState(value.join(", "));

  const commit = (text: string) => {
    setRaw(text);
    const emails = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(emails);
  };

  return (
    <div>
      <label className={labelCls()}>Attendees (comma separated emails)</label>
      <input
        className={inputCls()}
        placeholder="jane@company.com, ali@company.com"
        value={raw}
        onChange={(e) => commit(e.target.value)}
      />
    </div>
  );
}

function CreateMeetingForm({
  connectionId,
  providerKey,
  onCreated,
}: {
  connectionId: string;
  providerKey: string;
  onCreated: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !startTime) {
      setError("Topic and start time are required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createMeeting(connectionId, providerKey, {
        topic,
        startTime,
        durationMinutes,
        timezone,
        ...(attendees.length > 0 ? { attendees } : {}),
      });
      setTopic("");
      setStartTime("");
      setDurationMinutes(30);
      setAttendees([]);
      onCreated();
    } catch (err: any) {
      setError("Failed to create meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-2xl p-5 bg-white dark:bg-transparent shadow-sm dark:shadow-none border border-black/5 dark:border-white/10 space-y-4"
    >
      <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
        Create Meeting
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls()}>Topic</label>
          <input
            className={inputCls()}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Weekly sync"
          />
        </div>

        <div>
          <label className={labelCls()}>Start time</label>
          <input
            type="datetime-local"
            className={inputCls()}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls()}>Duration (minutes)</label>
          <input
            type="number"
            min={1}
            className={inputCls()}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelCls()}>Timezone</label>
          <input
            className={inputCls()}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <AttendeesInput value={attendees} onChange={setAttendees} />
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-gold btn-gold-hover inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A] disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Create meeting
      </button>
    </form>
  );
}

function EditMeetingModal({
  connectionId,
  providerKey,
  meetingId,
  initial,
  onClose,
  onUpdated,
}: {
  connectionId: string;
  providerKey: string;
  meetingId: string;
  initial: { topic?: string; startTime?: string; durationMinutes?: number; timezone?: string };
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [topic, setTopic] = useState(initial.topic || "");
  const [startTime, setStartTime] = useState(initial.startTime || "");
  const [durationMinutes, setDurationMinutes] = useState(initial.durationMinutes || 30);
  const [timezone, setTimezone] = useState(initial.timezone || "UTC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateMeeting(connectionId, providerKey, meetingId, {
        topic,
        startTime,
        durationMinutes,
        timezone,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError("Failed to update meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#171310] border border-black/10 dark:border-white/10 p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-foreground">Edit Meeting</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className={labelCls()}>Topic</label>
          <input className={inputCls()} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>

        <div>
          <label className={labelCls()}>Start time</label>
          <input
            type="datetime-local"
            className={inputCls()}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls()}>Duration (minutes)</label>
          <input
            type="number"
            min={1}
            className={inputCls()}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </div>

        <div>
          <label className={labelCls()}>Timezone</label>
          <input className={inputCls()} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3.5 py-2 text-[12.5px] font-medium text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold btn-gold-hover rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A] disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddRegistrantsModal({
  connectionId,
  providerKey,
  meetingId,
  onClose,
  onAdded,
}: {
  connectionId: string;
  providerKey: string;
  meetingId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [attendees, setAttendees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attendees.length === 0) {
      setError("Add at least one attendee.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await addRegistrants(connectionId, providerKey, meetingId, attendees);
      onAdded();
      onClose();
    } catch (err: any) {
      setError("Failed to add registrants.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#171310] border border-black/10 dark:border-white/10 p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-foreground">Add Registrants</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <AttendeesInput value={attendees} onChange={setAttendees} />

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 dark:border-white/10 px-3.5 py-2 text-[12.5px] font-medium text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold btn-gold-hover rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-[#17130A] disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Inline row actions to drop next to any meeting item: Edit / Add registrants / Delete.
 * Kept generic so it can be reused inside MeetingsList without altering its existing markup much.
 */
export function MeetingRowActions({
  connectionId,
  providerKey,
  meetingId,
  initial,
  onChanged,
}: {
  connectionId: string;
  providerKey: string;
  meetingId: string;
  initial: { topic?: string; startTime?: string; durationMinutes?: number; timezone?: string };
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [registrantsOpen, setRegistrantsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this meeting?")) return;
    setIsDeleting(true);
    try {
      await deleteMeeting(connectionId, providerKey, meetingId);
      onChanged();
    } catch {
      // no-op; MeetingsList shows stale data until next successful refetch
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setRegistrantsOpen(true)}
        title="Add registrants"
        className="inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setEditOpen(true)}
        title="Edit meeting"
        className="inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-1.5 text-muted-foreground hover:text-foreground hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        title="Delete meeting"
        className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-1.5 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      >
        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>

      {editOpen && (
        <EditMeetingModal
          connectionId={connectionId}
          providerKey={providerKey}
          meetingId={meetingId}
          initial={initial}
          onClose={() => setEditOpen(false)}
          onUpdated={onChanged}
        />
      )}

      {registrantsOpen && (
        <AddRegistrantsModal
          connectionId={connectionId}
          providerKey={providerKey}
          meetingId={meetingId}
          onClose={() => setRegistrantsOpen(false)}
          onAdded={onChanged}
        />
      )}
    </div>
  );
}

export { CreateMeetingForm };