import { clearCollections, setupTestDb, teardownTestDb } from "../helpers/db";
import { createTestAdmin } from "../helpers/factories";
import { buildJsonRequest, buildRequest } from "../helpers/request";
import Settings from "@/models/Settings";
import AuditLog from "@/models/AuditLog";
import { getChangeCutoff, getCancellationCutoff } from "@/lib/self-service/cutoff";

const { requireAdminMfaMock } = vi.hoisted(() => ({ requireAdminMfaMock: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireAdminMfa: requireAdminMfaMock }));
vi.mock("@/lib/db", () => ({ default: vi.fn().mockResolvedValue(undefined) }));
import { GET, POST } from "@/app/api/settings/route";

async function admin() {
  const user = await createTestAdmin();
  requireAdminMfaMock.mockResolvedValue({ actor: { user, role: "admin", sessionVersion: 1 }, response: null });
}
const get = () => GET(buildRequest("http://localhost/api/settings?key=cancellationTime"));
const save = (value: unknown, key = "cancellationTime") => POST(buildJsonRequest("http://localhost/api/settings", { key, value }));
describe("separate cancellation setting", () => {
  beforeAll(setupTestDb);
  beforeEach(async () => { await clearCollections(); requireAdminMfaMock.mockReset(); });
  afterAll(teardownTestDb);
  it("defaults independently to 11:59 even when ordering uses another time", async () => {
    await admin(); await Settings.create({ key: "cutoffTime", value: { hour: 18, minute: 0 } });
    const response = await get(); expect(response.status).toBe(200);
    expect((await response.json()).data.value).toEqual({ hour: 11, minute: 59 });
    expect(await getCancellationCutoff()).toEqual({ hour: 11, minute: 59 });
    expect(await getChangeCutoff()).toEqual({ hour: 18, minute: 0 });
    expect(await Settings.countDocuments({ key: "cancellationTime" })).toBe(0);
  });
  it.each([401, 403])("requires admin MFA for reading and changing cancellation time (%s)", async status => {
    requireAdminMfaMock.mockImplementation(() => Promise.resolve({ actor: null, response: Response.json({ success: false }, { status }) }));
    expect((await get()).status).toBe(status); expect((await save({ hour: 9, minute: 0 })).status).toBe(status);
    expect(await Settings.countDocuments()).toBe(0);
  });
  it("saves midnight and zero minutes exactly, records the admin, and leaves ordering unchanged", async () => {
    await admin(); await Settings.create({ key: "cutoffTime", value: { hour: 18, minute: 30 } });
    expect((await save({ hour: 0, minute: 0 })).status).toBe(200);
    expect((await (await get()).json()).data.value).toEqual({ hour: 0, minute: 0 });
    expect(await getCancellationCutoff()).toEqual({ hour: 0, minute: 0 });
    expect(await getChangeCutoff()).toEqual({ hour: 18, minute: 30 });
    expect(await AuditLog.findOne({ action: "settings.cancellation-time.update" }).lean()).toMatchObject({ actorRole: "admin", metadata: { before: { hour: 11, minute: 59 }, after: { hour: 0, minute: 0 } } });
    expect((await save({ hour: 23, minute: 59 })).status).toBe(200);
    expect(await getCancellationCutoff()).toEqual({ hour: 23, minute: 59 });
  });
  it.each([{ hour: 24, minute: 0 }, { hour: -1, minute: 0 }, { hour: 1, minute: 60 }, { hour: 1.5, minute: 0 }, { hour: 1, minute: 1.5 }, { hour: "11", minute: 59 }, { hour: 11 }, {}, null, "11:59"])("rejects an invalid time without changing either setting: %j", async value => {
    await admin();
    await Settings.create([{ key: "cancellationTime", value: { hour: 9, minute: 0 } }, { key: "cutoffTime", value: { hour: 18, minute: 0 } }]);
    expect((await save(value)).status).toBe(400);
    expect(await getCancellationCutoff()).toEqual({ hour: 9, minute: 0 });
    expect(await getChangeCutoff()).toEqual({ hour: 18, minute: 0 });
  });
  it("ordering edits do not change cancellation, and preserve ordering validation", async () => {
    await admin(); await save({ hour: 9, minute: 0 });
    expect((await save({ hour: 20, minute: 0 }, "cutoffTime")).status).toBe(200);
    expect(await getCancellationCutoff()).toEqual({ hour: 9, minute: 0 });
    expect(await getChangeCutoff()).toEqual({ hour: 20, minute: 0 });
    expect((await save({ hour: 24, minute: 0 }, "cutoffTime")).status).toBe(400);
  });
});
