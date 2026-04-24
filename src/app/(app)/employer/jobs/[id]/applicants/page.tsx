import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";

export const metadata: Metadata = { title: "Applicants — Energized" };

export default async function JobApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id } = await params;

  const [job] = await db
    .select({
      id: jobListings.id,
      orgId: jobListings.orgId,
      title: jobListings.title,
      status: jobListings.status,
    })
    .from(jobListings)
    .where(eq(jobListings.id, id))
    .limit(1);
  if (!job) notFound();

  const [member] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, job.orgId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) notFound();

  const rows = await db
    .select({
      id: applications.id,
      coverNote: applications.coverNote,
      screeningAnswers: applications.screeningAnswers,
      createdAt: applications.createdAt,
      candidateId: user.id,
      candidateName: user.name,
      candidateImage: user.image,
      headline: profiles.headline,
      location: profiles.location,
      yearsExperience: profiles.yearsExperience,
      sectors: profiles.sectors,
    })
    .from(applications)
    .innerJoin(user, eq(user.id, applications.candidateId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(applications.jobId, job.id))
    .orderBy(desc(applications.createdAt));

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <div
        className="v2-container"
        style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 960 }}
      >
        <Link
          href="/employer/profile#ep-jobs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 20,
            fontFamily: "var(--v2-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Icon
            name="arrowUpRight"
            size={12}
            style={{ transform: "rotate(180deg)" }}
          />{" "}
          Back to company profile
        </Link>

        <div className="v2-eyebrow">Applicants · {rows.length}</div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          {job.title ?? "Untitled role"}
        </h1>
        <p style={{ color: "var(--v2-ink-500)", marginBottom: 24 }}>
          Newest first.
        </p>

        {rows.length === 0 ? (
          <div
            style={{
              padding: 48,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 24,
                fontWeight: 900,
                fontStyle: "italic",
                marginBottom: 10,
              }}
            >
              No applicants yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Share the link to your role.
            </p>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--v2-ink-50)",
                borderRadius: 10,
                fontFamily: "var(--v2-font-mono)",
                fontSize: 12,
                color: "var(--v2-ink-700)",
                display: "inline-block",
              }}
            >
              /jobs/{job.id}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {rows.map((r) => {
              const initials = (r.candidateName ?? "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const appliedLabel = new Date(r.createdAt).toLocaleDateString(
                "en-CA",
                { month: "short", day: "numeric" },
              );
              return (
                <div
                  key={r.id}
                  style={{
                    padding: 22,
                    background: "white",
                    border: "1px solid var(--v2-ink-200)",
                    borderRadius: "var(--v2-r-xl)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "var(--v2-ink-900)",
                        color: "var(--v2-accent)",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--v2-font-serif)",
                        fontSize: 18,
                        fontWeight: 900,
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {r.candidateImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.candidateImage}
                          alt={r.candidateName ?? ""}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 17 }}>
                          {r.candidateName ?? "Anonymous"}
                        </div>
                        <span className="v2-chip v2-chip-accent">Submitted</span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--v2-ink-600)",
                          marginBottom: 10,
                        }}
                      >
                        {r.headline ?? "—"}
                        {r.location && ` · ${r.location}`}
                        {r.yearsExperience != null &&
                          ` · ${r.yearsExperience}y exp.`}
                      </div>
                      {r.coverNote && (
                        <div
                          style={{
                            padding: "10px 14px",
                            background: "var(--v2-ink-50)",
                            borderRadius: 10,
                            fontSize: 14,
                            color: "var(--v2-ink-800)",
                            marginBottom: 10,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                          }}
                        >
                          {r.coverNote}
                        </div>
                      )}
                      {r.screeningAnswers.length > 0 && (
                        <details style={{ marginBottom: 10 }}>
                          <summary
                            style={{
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "var(--v2-font-mono)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--v2-ink-500)",
                            }}
                          >
                            Answers · {r.screeningAnswers.length}
                          </summary>
                          <ol
                            style={{
                              paddingLeft: 20,
                              marginTop: 8,
                              display: "grid",
                              gap: 6,
                              fontSize: 13,
                              color: "var(--v2-ink-700)",
                            }}
                          >
                            {r.screeningAnswers.map((a, i) => (
                              <li key={i}>
                                <strong>{a.q}</strong>
                                <div>{a.a || <em>No answer</em>}</div>
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Link
                          href={`/p/${r.candidateId}`}
                          className="v2-btn v2-btn-ghost v2-btn-sm"
                        >
                          View full profile{" "}
                          <Icon name="arrowUpRight" size={13} />
                        </Link>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--v2-ink-500)",
                            fontFamily: "var(--v2-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Applied {appliedLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
