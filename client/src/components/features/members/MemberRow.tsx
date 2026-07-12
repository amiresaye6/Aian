"use client";

import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Member } from "@/types/members";
import { RoleBadge } from "./RoleBadge";

export function MemberRow({
  member,
  isFirst,
  onRemove,
}: {
  member: Member;
  isFirst: boolean;
  onRemove: () => void;
}) {
  const isPending = member.memberStatus === "invited";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
        !isFirst && "border-t border-black/5 dark:border-white/5",
      )}
    >
       <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-[13px] font-semibold uppercase text-foreground">
        {member.fullName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-foreground">{member.fullName}</div>
        <div className="text-[11.5px] text-muted-foreground">
          {isPending ? "Invitation pending" : member.email}
        </div>
      </div>
      <RoleBadge roleKey={member.role.key} roleName={member.role.name} />
      <button
        onClick={onRemove}
         className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/5 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}