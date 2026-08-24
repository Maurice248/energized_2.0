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

function buildCtx() {
  return {
    db: {} as Record<string, unknown>,
    session: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("contact.submit", () => {
  beforeEach(() => {
    trigger.mockReset();
    trigger.mockResolvedValue({ id: "run_1" });
  });

  it("queues an email for a valid message", async () => {
    const caller = createCaller(buildCtx());
    const result = await caller.contact.submit({
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
    expect(result).toEqual({ ok: true });
    expect(trigger).toHaveBeenCalledWith("send-contact-email", {
      name: "Mara Solis",
      email: "mara@example.com",
      message: "Looking for a 14/7 controls role.",
    });
  });

  it("silently accepts honeypot submissions without sending", async () => {
    const caller = createCaller(buildCtx());
    const result = await caller.contact.submit({
      name: "Bot",
      email: "bot@example.com",
      message: "spam",
      website: "https://spam.example",
    });
    expect(result).toEqual({ ok: true });
    expect(trigger).not.toHaveBeenCalled();
  });
});
