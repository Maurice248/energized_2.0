"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/shared/icon";
import { sendContactMessage } from "./actions";

const TOPICS = [
  { id: "general", label: "General", desc: "Tell us anything" },
  { id: "seeker", label: "Job seekers", desc: "About your search" },
  { id: "employer", label: "Employers & hiring", desc: "Posting and pipelines" },
  { id: "billing", label: "Billing", desc: "Plans, invoices, refunds" },
  { id: "partnerships", label: "Partnerships", desc: "Co-marketing & integrations" },
  { id: "press", label: "Press", desc: "Quotes & briefings" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

const CHAR_MAX = 2000;

export function ContactForm() {
  const [topic, setTopic] = useState<TopicId>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  const [website, setWebsite] = useState(""); // honeypot
  const [sent, setSent] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showCompany =
    topic === "employer" ||
    topic === "partnerships" ||
    topic === "billing";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!consent) return;
    startTransition(async () => {
      const result = await sendContactMessage({
        topic,
        name,
        email,
        company: company || null,
        role: role || null,
        size: size || null,
        subject,
        message,
        consent: true,
        website,
      });
      if (result.ok) {
        setRefCode(result.ref);
        setSent(true);
      } else {
        setErrorMsg(result.error);
      }
    });
  };

  const reset = () => {
    setSent(false);
    setRefCode("");
    setName("");
    setEmail("");
    setCompany("");
    setRole("");
    setSize("");
    setSubject("");
    setMessage("");
    setTopic("general");
    setErrorMsg(null);
  };

  if (sent) {
    return (
      <div className="v2-form-sent">
        <div className="v2-form-sent-mark">
          <Icon name="check" size={36} strokeWidth={2.5} />
        </div>
        <h3>
          Message <em>sent</em>.
        </h3>
        <p>
          Thanks{name ? `, ${name.split(" ")[0]}` : ""}. A real human on our
          team will reply within one business day.
        </p>
        <div className="v2-form-sent-ref">
          <span style={{ color: "var(--v2-ink-400)" }}>Ref</span>
          <strong>{refCode}</strong>
          <span style={{ color: "var(--v2-ink-300)" }}>·</span>
          <span>Saved to your inbox</span>
        </div>
        <div className="v2-form-sent-actions">
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={reset}
          >
            Send another
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="v2-contact-form-wrap" onSubmit={submit}>
      <span className="v2-contact-form-eye">Send a message</span>
      <h2 className="v2-contact-form-title">
        Drop us a <em>line</em>. We answer everything.
      </h2>
      <p className="v2-contact-form-sub">
        Pick a topic so we route you to the right desk. We reply within one
        business day.
      </p>

      {/* topic chips */}
      <div
        className="v2-topic-row"
        role="radiogroup"
        aria-label="Topic"
      >
        {TOPICS.map((t) => (
          <button
            type="button"
            key={t.id}
            role="radio"
            aria-checked={topic === t.id}
            className={`v2-topic-chip ${topic === t.id ? "active" : ""}`}
            onClick={() => setTopic(t.id)}
          >
            <span className="dot" />
            {t.label}
          </button>
        ))}
      </div>

      {/* honeypot — visually hidden, bots fill it */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -10000,
          top: "auto",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="v2-form-grid">
        <div className="v2-field">
          <label>
            Your name<span className="req">*</span>
          </label>
          <input
            type="text"
            placeholder="Avery Singh"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="v2-field">
          <label>
            Email<span className="req">*</span>
          </label>
          <input
            type="email"
            placeholder="you@company.ca"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={240}
          />
        </div>

        {showCompany && (
          <>
            <div className="v2-field">
              <label>Company</label>
              <input
                type="text"
                placeholder="Acme Energy Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={160}
              />
            </div>
            <div className="v2-field">
              <label>Your role</label>
              <input
                type="text"
                placeholder="Head of Talent"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={160}
              />
            </div>
            <div className="v2-field full">
              <label>Hiring volume / team size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">Select range…</option>
                <option>1–5 hires per year</option>
                <option>6–25 hires per year</option>
                <option>26–100 hires per year</option>
                <option>100+ hires per year</option>
                <option>Just exploring</option>
              </select>
            </div>
          </>
        )}

        <div className="v2-field full">
          <label>
            Subject<span className="req">*</span>
          </label>
          <input
            type="text"
            placeholder="A short headline so we know what this is about"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        <div className="v2-field full">
          <label>
            Message<span className="req">*</span>
          </label>
          <textarea
            placeholder="Tell us what you need. Bullet points are welcome — we read every one."
            value={message}
            onChange={(e) =>
              setMessage(e.target.value.slice(0, CHAR_MAX))
            }
            required
          />
          <div className="v2-field-hint">
            <span>Plain text, links OK</span>
            <span
              className={message.length > CHAR_MAX * 0.9 ? "" : "ok"}
            >
              {message.length} / {CHAR_MAX}
            </span>
          </div>
        </div>
      </div>

      <label className="v2-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I agree to be contacted at this email about my message. We
          don&rsquo;t share your details with anyone, ever.
        </span>
      </label>

      {errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "var(--v2-coral-soft, #FBEBE4)",
            color: "#A63A20",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="v2-form-foot">
        <div className="v2-form-foot-meta">
          <span className="dot" />
          We reply within{" "}
          <strong style={{ color: "var(--v2-ink-700)" }}>
            one business day
          </strong>
          .
        </div>
        <button
          type="submit"
          className="v2-send-btn"
          disabled={!consent || pending}
        >
          {pending ? "Sending…" : "Send message"}
          <span className="arrow">
            <Icon name="send" size={14} strokeWidth={2.2} />
          </span>
        </button>
      </div>
    </form>
  );
}
