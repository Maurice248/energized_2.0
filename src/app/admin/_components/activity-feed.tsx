import {
  classifyAuditAction,
  formatAuditAgo,
  renderAuditDescription,
  type AuditLogFeedEntry,
} from "@/lib/audit-log-display";
import { Icon } from "@/components/shared/icon";

export function ActivityFeed({ entries }: { entries: AuditLogFeedEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="v2-mod-empty">
        No activity logged yet. The audit log will populate as admins act.
      </div>
    );
  }
  return (
    <div className="v2-actv-list">
      {entries.map((entry) => {
        const cls = classifyAuditAction(entry.action);
        return (
          <div key={entry.id} className="v2-actv">
            <div className={`v2-actv-dot ${cls.tone}`}>
              <Icon name={cls.icon} size={14} />
            </div>
            <div>
              <div className="v2-actv-text">{renderAuditDescription(entry)}</div>
              <div className="v2-actv-time">{formatAuditAgo(entry.at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
