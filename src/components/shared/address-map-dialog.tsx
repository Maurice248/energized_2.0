"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { useAddressMap } from "@/hooks/use-address-map";

export function AddressMapDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (address: string) => void;
  title: string;
  description: string;
}) {
  const {
    query,
    setQuery,
    selected,
    setSelected,
    predictions,
    status,
    mapElRef,
    searchRef,
    pickPrediction,
    useMyLocation,
    searchAndPan,
  } = useAddressMap({ open, value });

  const confirm = () => {
    const next = selected.trim() || query.trim();
    onConfirm(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="v2 z-[70] bg-white px-6 pt-6 pb-4 sm:max-w-2xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="amap-search">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            className="amap-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(e.target.value);
            }}
            placeholder="Search a Canadian address, city, or site"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (predictions[0]) pickPrediction(predictions[0]);
              else searchAndPan(query);
            }}
          />
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={useMyLocation}
          >
            Near me
          </button>
          {predictions.length > 0 && (
            <ul className="amap-predictions" role="listbox">
              {predictions.map((p) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickPrediction(p)}
                  >
                    <Icon name="mapPin" size={14} />
                    <span>
                      <strong>{p.label}</strong>
                      {p.secondary ? <em>{p.secondary}</em> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="amap-canvas" ref={mapElRef} />

        {status && <p className="amap-status">{status}</p>}

        <DialogFooter className="mx-0 mb-0 items-center border-0 bg-transparent px-1 pb-0 pt-0 sm:justify-between">
          <p className="amap-selected">
            {selected.trim() || "Click the map or pick a search result."}
          </p>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={confirm}
              disabled={!selected.trim() && !query.trim()}
            >
              Use this address
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
