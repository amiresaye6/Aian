"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, SearchX } from "lucide-react";
import { FaqItem } from "@/lib/constants/help-content";

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-muted-foreground">
          <SearchX className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
          No results found
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Try a different search term or browse another category.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01]">
      {items.map((item, i) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className={i !== 0 ? "border-t border-white/5" : ""}>
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className={`flex w-full items-center justify-between gap-4 px-5 py-4.5 text-left outline-none transition-all focus-visible:bg-white/[0.03] ${
                isOpen
                  ? "border-l-2 border-[color:var(--gold-soft)] bg-white/[0.03] pl-[18px]"
                  : "border-l-2 border-transparent hover:bg-white/[0.025]"
              }`}
            >
              <span
                className={`text-[14.5px] font-medium transition-colors ${
                  isOpen ? "text-[color:var(--gold-soft)]" : "text-foreground"
                }`}
              >
                {item.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-[color:var(--gold-soft)]" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[65ch] px-5 pb-5 text-[13.5px] leading-[1.75] text-foreground/70">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}