"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { AddressMapDialog } from "@/components/shared/address-map-dialog";
import { cn } from "@/lib/utils";

type Variant = "block" | "inline" | "compact";

export function AddressPicker({
  value,
  onChange,
  label,
  placeholder = "Search a Canadian address",
  required,
  disabled,
  className,
  variant = "block",
  error,
  id,
  dialogTitle = "Choose a location",
  dialogDescription = "Search an address or drop a pin. The map and search stay in sync.",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: Variant;
  error?: boolean;
  id?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const display = value.trim();

  const trigger = (
    <div className={cn("amap-trigger-wrap", className)}>
      <button
        id={id}
        type="button"
        className={cn(
          "amap-trigger",
          variant === "block" && "v2-input-block",
          variant === "compact" && "amap-trigger-compact",
          variant === "inline" && "amap-trigger-inline",
          error && "has-error",
        )}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {variant !== "block" && <Icon name="mapPin" size={16} />}
        <span className={display ? "amap-trigger-value" : "amap-trigger-placeholder"}>
          {display || placeholder}
        </span>
      </button>
      {display && !disabled && (
        <button
          type="button"
          className="amap-clear"
          aria-label="Clear location"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {label ? (
        <div className="ob-field">
          <label htmlFor={id}>
            {label}
            {required ? <span style={{ color: "var(--v2-coral)" }}> *</span> : null}
          </label>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <AddressMapDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onConfirm={onChange}
        title={dialogTitle}
        description={dialogDescription}
      />
    </>
  );
}
