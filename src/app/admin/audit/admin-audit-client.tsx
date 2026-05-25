"use client";

import { useEffect, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  classifyAuditAction,
  formatAuditAbsolute,
  renderAuditDescription,
} from "@/lib/audit-log-display";
import { Icon } from "@/components/shared/icon";
import { SectionCard } from "@/app/admin/_components/section-card";

const PAGE_SIZE = 35;

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All entity types" },
  { value: "page", label: "CMS page" },
  { value: "user", label: "User account" },
  { value: "employer_org", label: "Employer org" },
  { value: "certification", label: "Candidate credential" },
  { value: "revenue_snapshot", label: "Revenue snapshot" },
];

function AuditLogTable({
  entityFilter,
  q,
}: {
  entityFilter?: string;
  q?: string;
}) {
  const [page, setPage] = useState(0);

  const { data, isFetching } = api.admin.audit.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    q,
    entityType: entityFilter,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {items.length === 0 && !isFetching ? (
        <div className="v2-tbl-empty">
          No audit rows match these filters yet. Actions from{" "}
          <strong>/admin/pages</strong>, <strong>/admin/verifications</strong>, and{" "}
          <strong>/admin/users</strong> will appear here as soon as they run in production.
        </div>
      ) : (
        <>
          <div className="v2-tbl v2-tbl--audit">
            <div className="v2-tbl-th">
              <span>When</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Detail</span>
            </div>
            {items.map((entry) => {
              const cls = classifyAuditAction(entry.action);
              return (
                <div key={entry.id} className="v2-tbl-row v2-tbl-row--plain">
                  <div className="v2-audit-time">{formatAuditAbsolute(entry.at)}</div>
                  <div className="v2-tbl-cell-muted" title={entry.actor}>
                    {entry.actor}
                  </div>
                  <div title={entry.action}>
                    <span className="v2-audit-action-chip">{entry.action}</span>
                  </div>
                  <div className="v2-audit-entity-type" title={entry.entityType ?? ""}>
                    {entry.entityType ?? "—"}
                  </div>
                  <div className="v2-audit-detail">
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div
                        className={`v2-actv-dot ${cls.tone}`}
                        style={{ marginTop: 3, flexShrink: 0 }}
                      >
                        <Icon name={cls.icon} size={14} />
                      </div>
                      <div className="v2-actv-text">{renderAuditDescription(entry)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 16,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--v2-ink-600)" }}>
              {total.toLocaleString()} total · page {page + 1} of {pageCount}
              {isFetching ? " · loading…" : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0 || isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1 || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function AdminAuditClient() {
  const utils = api.useUtils();
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entityType, setEntityType] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchDraft.trim()), 300);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const entityFilter = entityType === "all" ? undefined : entityType;
  const q = debouncedSearch || undefined;

  async function handleExportCsv() {
    try {
      const res = await utils.admin.audit.list.fetch({
        limit: 500,
        offset: 0,
        q,
        entityType: entityFilter,
      });
      const header = [
        "timestamp_iso",
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "meta_json",
      ];
      const lines = [
        header.join(","),
        ...res.items.map((row) =>
          [
            csvEscape(new Date(row.at).toISOString()),
            csvEscape(row.actor),
            csvEscape(row.action),
            csvEscape(row.entityType ?? ""),
            csvEscape(row.entityId ?? ""),
            csvEscape(JSON.stringify(row.meta)),
          ].join(","),
        ),
      ];
      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `energized-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.items.length} row${res.items.length === 1 ? "" : "s"}`);
    } catch (err) {
      const message =
        err instanceof TRPCClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not export audit log.";
      toast.error(message);
    }
  }

  return (
    <>
      <Toaster />
      <SectionCard
        title={
          <>
            Live <em>trail</em>
          </>
        }
        action={
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm inline-flex items-center gap-2"
            onClick={() => void handleExportCsv()}
          >
            <Icon name="download" size={14} />
            Export CSV
          </button>
        }
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
            marginBottom: 16,
          }}
        >
          <div className="v2-admin-users-field" style={{ flex: "1 1 220px", marginTop: 0 }}>
            <label htmlFor="audit-search">Search actor or action</label>
            <Input
              id="audit-search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="e.g. page.updated, certification, @company.ca"
              className="h-10"
            />
          </div>
          <div className="v2-admin-users-field" style={{ flex: "0 1 220px", marginTop: 0 }}>
            <label htmlFor="audit-entity">Entity</label>
            <select
              id="audit-entity"
              className="v2-admin-users-select"
              style={{ marginTop: 0 }}
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AuditLogTable
          key={`${entityType}:${debouncedSearch}`}
          entityFilter={entityFilter}
          q={q}
        />
      </SectionCard>
    </>
  );
}
