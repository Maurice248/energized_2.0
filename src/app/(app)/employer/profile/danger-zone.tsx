"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";

export function DangerZone({
  id,
  isOwner,
  orgName,
}: {
  id: string;
  isOwner: boolean;
  orgName: string;
}) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");

  const deleteOrg = api.employer.deleteOrg.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  const leaveOrg = api.employer.leaveOrg.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  return (
    <section
      id={id}
      style={{
        marginTop: 32,
        padding: 22,
        background: "#FEF2F2",
        border: "1px solid #FCA5A5",
        borderRadius: "var(--v2-r-lg)",
      }}
    >
      <h3
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#991B1B",
          margin: "0 0 6px",
        }}
      >
        Danger zone
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "#7F1D1D",
          margin: "0 0 16px",
        }}
      >
        {isOwner
          ? "Permanent. Deletes every job, applicant, and team member tied to this organization."
          : "Removes you from this organization. You'll keep your jobseeker profile if you have one."}
      </p>

      {isOwner ? (
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              color: "#7F1D1D",
              marginBottom: 6,
            }}
          >
            Type{" "}
            <span style={{ fontFamily: "monospace" }}>{orgName}</span> to
            confirm
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={orgName}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: 14,
                border: "1px solid #FCA5A5",
                borderRadius: 8,
                background: "white",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    `This permanently deletes ${orgName} and all of its data. Continue?`,
                  )
                )
                  return;
                deleteOrg.mutate({ confirmName });
              }}
              disabled={
                deleteOrg.isPending ||
                confirmName.trim().toLowerCase() !==
                  orgName.trim().toLowerCase()
              }
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                background:
                  deleteOrg.isPending ||
                  confirmName.trim().toLowerCase() !==
                    orgName.trim().toLowerCase()
                    ? "#FCA5A5"
                    : "#DC2626",
                border: "none",
                borderRadius: 8,
                cursor:
                  deleteOrg.isPending ||
                  confirmName.trim().toLowerCase() !==
                    orgName.trim().toLowerCase()
                    ? "not-allowed"
                    : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {deleteOrg.isPending ? "Deleting…" : "Delete organization"}
            </button>
          </div>
          {deleteOrg.error && (
            <div
              role="alert"
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#7F1D1D",
              }}
            >
              {deleteOrg.error.message}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  `Leave ${orgName}? You'll lose access to its jobs and applicants.`,
                )
              )
                return;
              leaveOrg.mutate();
            }}
            disabled={leaveOrg.isPending}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              color: "#991B1B",
              background: "white",
              border: "1px solid #FCA5A5",
              borderRadius: 8,
              cursor: leaveOrg.isPending ? "not-allowed" : "pointer",
            }}
          >
            {leaveOrg.isPending ? "Leaving…" : `Leave ${orgName}`}
          </button>
          {leaveOrg.error && (
            <div
              role="alert"
              style={{
                marginTop: 10,
                fontSize: 13,
                color: "#7F1D1D",
              }}
            >
              {leaveOrg.error.message}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
