"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

export function ContactForm({ inboxEmail }: { inboxEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);

  const submit = api.contact.submit.useMutation({
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="v2-form-sent">
        <div className="v2-form-sent-mark">
          <Icon name="check" size={32} />
        </div>
        <h3>
          Message <em>sent.</em>
        </h3>
        <p>
          Thanks — we read every message and reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form
      className="v2-contact-form-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ name, email, message, website });
      }}
    >
      <div className="v2-contact-form-eye">Get in touch</div>
      <h2 className="v2-contact-form-title">
        Send us a <em>message.</em>
      </h2>
      <p className="v2-contact-form-sub">
        Have a question or need assistance? We&rsquo;ll get back to you within
        one business day. Required fields are marked with an asterisk.
      </p>

      <div className="v2-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="v2-form-grid">
        <div className="v2-field">
          <label htmlFor="contact-name">
            Your name <span className="req">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="v2-field">
          <label htmlFor="contact-email">
            Email address <span className="req">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="v2-field full">
          <label htmlFor="contact-message">
            How can we help? <span className="req">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      {submit.error ? (
        <p className="v2-contact-form-error" role="alert">
          Couldn&rsquo;t send that just now. Try again, or email{" "}
          <a href={`mailto:${inboxEmail}`}>{inboxEmail}</a>.
        </p>
      ) : null}

      <div className="v2-form-foot">
        <div className="v2-form-foot-meta">
          <span className="dot" />
          Usually within one business day
        </div>
        <button
          type="submit"
          className="v2-send-btn"
          disabled={submit.isPending}
        >
          {submit.isPending ? "Sending…" : "Send message"}
          <span className="arrow">
            <Icon name="arrowRight" size={14} />
          </span>
        </button>
      </div>
    </form>
  );
}
