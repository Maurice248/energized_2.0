"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

export type SaveViewer =
  | { kind: "anonymous"; signInHref: string }
  | { kind: "employer" }
  | { kind: "jobseeker"; initiallySaved: boolean };

export function SaveButton({
  jobId,
  viewer,
}: {
  jobId: string;
  viewer: SaveViewer;
}) {
  const initial = viewer.kind === "jobseeker" ? viewer.initiallySaved : false;
  const [saved, setSaved] = useState<boolean>(initial);

  const toggle = api.savedJobs.toggle.useMutation({
    onMutate: () => setSaved((s) => !s),
    onError: () => setSaved((s) => !s),
    onSuccess: (data) => setSaved(data.saved),
  });

  if (viewer.kind === "anonymous") {
    return (
      <Link
        href={viewer.signInHref}
        className="v2-btn v2-btn-ghost"
        title="Sign in to save roles"
      >
        <Icon name="bookmark" size={14} /> Save
      </Link>
    );
  }

  if (viewer.kind === "employer") {
    return (
      <button
        className="v2-btn v2-btn-ghost"
        disabled
        title="Employers can't save jobs"
      >
        <Icon name="bookmark" size={14} /> Save
      </button>
    );
  }

  return (
    <button
      className={`v2-btn ${saved ? "v2-btn-primary" : "v2-btn-ghost"}`}
      onClick={() => toggle.mutate({ jobId })}
      disabled={toggle.isPending}
      title={saved ? "Remove from saved" : "Save this role"}
    >
      <Icon name="bookmark" size={14} /> {saved ? "Saved" : "Save"}
    </button>
  );
}
