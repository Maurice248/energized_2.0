import { describe, it, expect, vi } from "vitest";
import { createCaller } from "@/server/api/root";

vi.mock("@/server/db", () => ({
  db: {} as Record<string, unknown>,
}));

vi.mock("@/server/auth", () => ({
  getSession: vi.fn(),
}));

function buildCtx(overrides?: {
  role?: "admin" | "jobseeker" | "employer" | "recruiter";
  userId?: string;
  db?: Record<string, unknown>;
}) {
  const role = overrides?.role ?? "admin";
  const userId = overrides?.userId ?? "u_admin";
  return {
    db: overrides?.db ?? ({} as Record<string, unknown>),
    session: {
      user: {
        id: userId,
        email: "admin@energized.ca",
        name: "Admin",
        role,
      },
      session: { id: "s_1", userId },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const TICKET_ID = "11111111-1111-4111-8111-111111111111";

describe("admin.support.setTicketStatus", () => {
  it("rejects non-admins", async () => {
    const caller = createCaller(buildCtx({ role: "jobseeker" }));
    await expect(
      caller.admin.support.setTicketStatus({
        id: TICKET_ID,
        status: "closed",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns NOT_FOUND when the ticket is missing", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const caller = createCaller(buildCtx({ db: { select } }));

    await expect(
      caller.admin.support.setTicketStatus({
        id: TICKET_ID,
        status: "in_progress",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("closes a ticket and writes an audit row", async () => {
    const limit = vi.fn().mockResolvedValue([
      { id: TICKET_ID, status: "open", assignedTo: null },
    ]);
    const selectWhere = vi.fn().mockReturnValue({ limit });
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
    const select = vi.fn().mockReturnValue({ from: selectFrom });

    const returning = vi.fn().mockResolvedValue([{ id: TICKET_ID, status: "closed" }]);
    const updateWhere = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const caller = createCaller(
      buildCtx({ db: { select, update, insert } }),
    );

    const result = await caller.admin.support.setTicketStatus({
      id: TICKET_ID,
      status: "closed",
    });

    expect(result).toEqual({ id: TICKET_ID, status: "closed" });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
      }),
    );
    expect(set.mock.calls[0]?.[0]?.closedAt).toBeInstanceOf(Date);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "support_ticket.status_changed",
        entityType: "support_ticket",
        entityId: TICKET_ID,
        meta: { from: "open", to: "closed" },
      }),
    );
  });
});
