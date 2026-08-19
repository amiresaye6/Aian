"use client";

import { cn } from "@/lib/utils";
import { FAQ_CATEGORIES, FaqCategory } from "@/lib/constants/help-content";

interface HelpCategoriesProps {
  selected: FaqCategory | "all";
  onSelect: (category: FaqCategory | "all") => void;
}

export function HelpCategories({ selected, onSelect }: HelpCategoriesProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        onClick={() => onSelect("all")}
        className={cn(
          "rounded-full border px-4 py-2 text-[12.5px] font-medium transition-all",
          selected === "all"
            ? "border-[color:var(--gold-soft)]/40 bg-gold-gradient text-[#17130A]"
            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        )}
      >
        All Topics
      </button>
      {FAQ_CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={cn(
            "rounded-full border px-4 py-2 text-[12.5px] font-medium transition-all",
            selected === cat.key
              ? "border-[color:var(--gold-soft)]/40 bg-gold-gradient text-[#17130A]"
              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}