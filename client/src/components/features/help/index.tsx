"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { HelpHero } from "./HelpHero";
import { HelpCategories } from "./HelpCategories";
import { FaqAccordion } from "./FaqAccordion";
import { QuickGuides } from "./QuickGuides";
import { ContactSupportBanner } from "./ContactSupportBanner";
import { FAQ_ITEMS, FaqCategory } from "@/lib/constants/help-content";

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const isFiltering = search.trim().length > 0 || category !== "all";

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-14 pb-8">
        <HelpHero search={search} onSearchChange={setSearch} />
        <HelpCategories selected={category} onSelect={setCategory} />

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Frequently Asked Questions
            </span>
            <span className="text-[12px] text-muted-foreground">
              {isFiltering
                ? `Showing ${filteredItems.length} of ${FAQ_ITEMS.length} articles`
                : `${FAQ_ITEMS.length} articles`}
            </span>
          </div>
          <FaqAccordion items={filteredItems} />
        </div>

        <QuickGuides />
        <ContactSupportBanner />
      </div>
    </AppLayout>
  );
}