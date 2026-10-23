import { setupTestDb, clearCollections, teardownTestDb } from "../helpers/db";
import { SupportBudget, SupportReservation } from "@/models/Support";
import { reserveBudget, settleBudget } from "@/lib/support/budget";
describe("shared AI budget", () => {
  beforeAll(async () => { await setupTestDb(); await Promise.all([SupportBudget.init(), SupportReservation.init()]); });
  beforeEach(clearCollections); afterAll(teardownTestDb);
  it("never admits concurrent reservations above the cap", async () => {
    const reservations = await Promise.all(Array.from({ length: 10 }, () => reserveBudget(10, 30)));
    expect(reservations.filter(Boolean)).toHaveLength(3);
    const record = await SupportBudget.findOne(); expect(record?.reservedMicros).toBe(30);
    expect(await reserveBudget(1, 30)).toBeNull();
  });
  it("settles once, releases unused allowance, and retains uncertain reservations", async () => {
    const id = (await reserveBudget(20, 30))!;
    await Promise.all([settleBudget(id, 5), settleBudget(id, 5)]);
    expect((await SupportBudget.findOne())?.chargedMicros).toBe(5);
    expect((await SupportBudget.findOne())?.reservedMicros).toBe(0);
    expect(await reserveBudget(25, 30)).toBeTruthy();
    expect(await reserveBudget(1, 30)).toBeNull();
  });
});
