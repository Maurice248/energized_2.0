"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "./icon";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// Drop-in replacement for <input type="password" /> with an eye toggle.
// Preserves all input props/classes so existing call sites swap cleanly.
export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div style={{ position: "relative" }}>
        <input
          ref={ref}
          {...props}
          type={visible ? "text" : "password"}
          style={{
            ...(props.style ?? {}),
            paddingRight: 40,
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: "var(--v2-ink-500)",
            cursor: "pointer",
            padding: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
    );
  },
);
