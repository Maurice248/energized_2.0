import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { PrintButton } from "./print-button";

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect("/candidates");
  }
  const sp = await searchParams;
  if (!sp.enrollment) notFound();

  const cert = await api.trainings
    .getCertificate({ enrollmentId: sp.enrollment })
    .catch(() => null);
  if (!cert) notFound();

  return (
    <div
      className="min-h-screen bg-slate-100 px-4 py-16 print:bg-white print:py-0"
      style={{ fontFamily: "var(--v2-font-sans, sans-serif)" }}
    >
      <div
        className="mx-auto max-w-3xl rounded-3xl bg-white p-12 shadow-xl print:rounded-none print:p-16 print:shadow-none"
        style={{ border: "8px solid var(--brand-dark-blue, #004984)" }}
      >
        <div className="flex items-center justify-between">
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={140}
            height={36}
            priority
          />
          <div
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            Verified credential
          </div>
        </div>

        <div className="mt-16 text-center">
          <div
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            Certificate of Completion
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">
            This certifies that
          </div>
          <h1
            className="mt-3 text-5xl font-bold tracking-tight"
            style={{ color: "var(--brand-black, #101820)" }}
          >
            {cert.candidateName}
          </h1>
          <div className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">
            has successfully completed
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-700">
            {cert.trainingTitle}
          </h2>
          {cert.trainingCertName && (
            <div className="mt-2 text-sm text-slate-500">
              {cert.trainingCertName} · {cert.trainingDurationLabel}
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 border-t border-slate-200 pt-8 text-xs">
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Completed on</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.completedAt ? fmtDate(cert.completedAt) : "—"}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Final score</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.finalScore !== null ? `${cert.finalScore}/100` : "—"}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Instructor</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.trainingInstructorName}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">
          Credential ID · {cert.enrollmentId}
        </div>

        <div className="mt-10 flex justify-center gap-3 print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
