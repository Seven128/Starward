import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { PoolClient } from "pg";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const databaseUrl = process.env.ACCOUNT_SESSION_TEST_DATABASE_URL;

for (const operation of ["preferences", "session", "deletion-race", "session-first"] as const) {
  test(`PostgreSQL account erasure prevents late ${operation} writes`, { skip: !databaseUrl, timeout: 60_000 }, async () => {
    assert.ok(databaseUrl);
    assert.match(new URL(databaseUrl).pathname, /^\/starward_account_session_[a-f0-9]+$/u);
    const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
    const userId = await repository.findOrCreateWechatUser(`account-session:${randomUUID()}`);
    const otherId = await repository.findOrCreateWechatUser(`account-session-other:${randomUUID()}`);
    const tokenDigest = randomUUID(), expiresAt = new Date(Date.now() + 3_600_000).toISOString();
    let blocker: PoolClient | null = null;
    let sessionRepository: PostgresMiniappRepository | null = null;
    let releaseSession: () => void = () => undefined;
    const waitForLocks = async (minimum: number) => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const count = Number((await repository.pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).rows[0]!.count);
        if (count >= minimum) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.fail(`expected ${minimum} real account lock waiters`);
    };
    try {
      await repository.createSession({ userId: otherId, tokenDigest: `other:${tokenDigest}`, expiresAt });
      if (operation === "deletion-race") {
        // Queue the delete first behind a real row lock, then the late login.
        // Both requests must reach PostgreSQL's lock wait before releasing it.
        blocker = await repository.pool.connect();
        await blocker.query("BEGIN");
        await blocker.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [userId]);
        const deletion = repository.deleteAccount(userId, `delete:${randomUUID()}`);
        await waitForLocks(1);
        const session = repository.createSession({ userId, tokenDigest, expiresAt });
        const rejected = assert.rejects(session, /account_not_active/u);
        await waitForLocks(2);
        await blocker.query("COMMIT"); blocker.release(); blocker = null;
        await deletion; await rejected;
      } else if (operation === "session-first") {
        // Pause the production session transaction after its actual INSERT.
        // The ACTIVE lock remains held until that transaction can commit.
        sessionRepository = await new PostgresMiniappRepository(databaseUrl).initialize();
        const connect = sessionRepository.pool.connect.bind(sessionRepository.pool);
        const hold = new Promise<void>(resolve => { releaseSession = resolve; });
        let inserted = false;
        sessionRepository.pool.connect = (async () => {
          const client = await connect();
          const query = client.query;
          client.query = (async (...args: unknown[]) => {
            const result = await Reflect.apply(query, client, args);
            if (typeof args[0] === "string" && args[0].includes("INSERT INTO user_sessions")) {
              inserted = true;
              await hold;
              client.query = query;
            }
            return result;
          }) as typeof client.query;
          return client;
        }) as typeof sessionRepository.pool.connect;
        const session = sessionRepository.createSession({ userId, tokenDigest, expiresAt });
        const deadline = Date.now() + 5_000;
        while (!inserted && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(inserted, true, "the real session INSERT must finish before deleting");
        const deletion = repository.deleteAccount(userId, `delete:${randomUUID()}`);
        await waitForLocks(1);
        releaseSession(); releaseSession = () => undefined;
        await session; await deletion;
        assert.equal(await repository.resolveSession(tokenDigest), null);
      } else {
        await repository.createSession({ userId, tokenDigest: `before:${tokenDigest}`, expiresAt });
        await repository.deleteAccount(userId, `delete:${randomUUID()}`);
        if (operation === "preferences") await assert.rejects(repository.ensureUser(userId), /account_not_active/u);
        else await assert.rejects(repository.createSession({ userId, tokenDigest, expiresAt }), /account_not_active/u);
      }
      assert.equal((await repository.pool.query("SELECT state FROM users WHERE user_id=$1", [userId])).rows[0]!.state, "DELETED");
      for (const table of ["user_preferences", "user_sessions"]) {
        assert.equal(Number((await repository.pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`, [userId])).rows[0]!.count), 0, `deleted ${table} must stay empty`);
      }
      assert.equal(await repository.resolveSession(`other:${tokenDigest}`), otherId);
      assert.equal((await repository.getPreferences(otherId)).revision, 1);
    } finally {
      releaseSession();
      if (blocker) { await blocker.query("ROLLBACK"); blocker.release(); }
      await sessionRepository?.close();
      await repository.close();
    }
  });
}
