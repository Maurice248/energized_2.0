import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCaller } from "@/server/api/root";

const { trigger } = vi.hoisted(() => ({
  trigger: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: {} as Record<string, unknown>,
}));

vi.mock("@/server/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger },
}));

vi.mock("@/lib/posthog", () => ({
  safeCapture: vi.fn().mockResolvedValue(undefined),
}));

function mockDb() {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values: insertValues });
  const limit = vi.fn().mockResolvedValue([]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { db: { insert, select }, insert, insertValues, select };
}

function buildCtx(db: Record<string, unknown>, session: unknown = null) {
  return {
    db,
    session,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("contact.submit", () => {
  beforeEach(() => {
    trigger.mockReset();
    trigger.mockResolvedValue({ id: "run_1" });
  });

  it("creates a support ticket and queues an email for a valid message", async () => {
    const { db, insert, insertValues } = mockDb();
    const caller = createCaller(buildCtx(db));
    const result = await caller.contact.submit({
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Contact from Mara Solis",
        body: "From: Mara Solis <mara@example.com>\n\nLooking for a 14/7 controls role.",
        priority: "p2",
        status: "open",
        requesterUserId: null,
      }),
    );
    expect(insertValues.mock.calls[0]?.[0]?.code).toMatch(/^CS-[A-F0-9]{8}$/);
    expect(trigger).toHaveBeenCalledWith("send-contact-email", {
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
  });

  it("still succeeds when the email worker cannot be queued", async () => {
    trigger.mockRejectedValue(new Error("Trigger.dev unreachable"));
    const { db, insertValues } = mockDb();
    const caller = createCaller(buildCtx(db));
    const result = await caller.contact.submit({
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
    expect(result).toEqual({ ok: true });
    expect(insertValues).toHaveBeenCalled();
  });

  it("links the ticket to the signed-in user", async () => {
    const { db, insertValues, select } = mockDb();
    const caller = createCaller(
      buildCtx(db, {
        user: { id: "u_mara", email: "mara@example.com", name: "Mara Solis" },
        session: { id: "s_1", userId: "u_mara" },
      }),
    );
    await caller.contact.submit({
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
    expect(select).not.toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ requesterUserId: "u_mara" }),
    );
  });

  it("silently accepts honeypot submissions without sending or filing a ticket", async () => {
    const { db, insert } = mockDb();
    const caller = createCaller(buildCtx(db));
    const result = await caller.contact.submit({
      name: "Bot",
      email: "bot@example.com",
      message: "spam",
      website: "https://spam.example",
    });
    expect(result).toEqual({ ok: true });
    expect(insert).not.toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
  });
});
