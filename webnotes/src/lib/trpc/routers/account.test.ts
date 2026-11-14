import { afterAll, expect, mock, test } from "bun:test";

const previousUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL ||= "postgresql://u";
const { accountRouter } = await import("./account");
const { default: prisma } = await import("../../prisma");
afterAll(() => {
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
});

test("revocation requires authentication and only deletes the current user's sessions", async () => {
  const remove = mock(async () => ({ count: 2 }));
  const database = new Proxy(prisma, {
    get(target, key) {
      return key === "session"
        ? { ...target.session, deleteMany: remove }
        : Reflect.get(target, key);
    },
  });
  {
    const anonymous = accountRouter.createCaller({
      prisma: database,
      userId: null,
      session: null,
    });
    await expect(anonymous.signOutAll()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(remove).not.toHaveBeenCalled();
    const caller = accountRouter.createCaller({
      prisma: database,
      userId: "owner",
      session: { user: { id: "owner" }, expires: "2099-01-01" },
    });
    await caller.signOutAll();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith({ where: { userId: "owner" } });
  }
});
