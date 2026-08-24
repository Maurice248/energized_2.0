"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { FaqItem, type PublicFaq } from "@/components/marketing/faq-item";

export type { PublicFaq };

const CATEGORY_ORDER: PublicFaq["category"][] = [
  "general",
  "seekers",
  "employers",
  "billing",
  "privacy",
];

const CATEGORY_LABEL: Record<PublicFaq["category"], string> = {
  general: "General",
  seekers: "Job seekers",
  employers: "Employers",
  billing: "Billing & plans",
  privacy: "Privacy & data",
};

type CategoryFilter = "all" | PublicFaq["category"];

type Props = { items: PublicFaq[] };

function searchableText(item: PublicFaq): string {
  const answer =
    item.answerFormat === "html"
      ? item.answer.replace(/<[^>]+>/g, " ")
      : item.answer;
  return `${item.question} ${answer}`.toLowerCase();
}

export function FaqsList({ items }: Props) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const next: Record<CategoryFilter, number> = {
      all: items.length,
      general: 0,
      seekers: 0,
      employers: 0,
      billing: 0,
      privacy: 0,
    };
    for (const item of items) next[item.category] += 1;
    return next;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (q.length === 0) return true;
      return searchableText(item).includes(q);
    });
  }, [items, category, query]);

  const tabs: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "All" },
    ...CATEGORY_ORDER.filter((c) => counts[c] > 0).map((c) => ({
      id: c,
      label: CATEGORY_LABEL[c],
    })),
  ];

  return (
    <>
      {tabs.length > 1 ? (
        <div className="v2-faq-tabs" role="tablist" aria-label="FAQ categories">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={`v2-faq-tab${category === tab.id ? " active" : ""}`}
              onClick={() => setCategory(tab.id)}
            >
              {tab.label}
              <span className="count">{counts[tab.id]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <label className="v2-faq-search">
          <Icon name="search" size={16} aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            aria-label="Search FAQs"
          />
          <kbd>/</kbd>
        </label>
      ) : null}

      {visible.length === 0 ? (
        <p className="v2-faq-empty">
          {items.length === 0
            ? "No published FAQs yet. Check back shortly, or contact us below."
            : "No questions match that search. Try another term or category."}
        </p>
      ) : (
        <div className="v2-faq-list">
          {visible.map((item, i) => (
            <FaqItem key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
