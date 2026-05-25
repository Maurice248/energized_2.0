type Ticket = {
  id: string;
  code: string;
  subject: string;
  priority: string;
  status: string;
  urgent: boolean;
  meta: string;
};

export function TicketsList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="v2-mod-empty">
        No open tickets — inbox zero (for now).
      </div>
    );
  }
  return (
    <>
      {tickets.map((t) => (
        <div key={t.id} className="v2-ticket">
          <span className={`v2-ticket-id ${t.urgent ? "urgent" : ""}`}>{t.code}</span>
          <div style={{ minWidth: 0 }}>
            <div className="v2-ticket-subj">{t.subject}</div>
            <div className="v2-ticket-meta">{t.meta}</div>
          </div>
          <span
            className={`v2-ticket-prio ${
              t.priority === "p1" ? "p1" : t.priority === "p2" ? "p2" : "p3"
            }`}
          >
            {t.priority.toUpperCase()}
          </span>
        </div>
      ))}
    </>
  );
}
