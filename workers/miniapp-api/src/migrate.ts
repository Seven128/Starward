import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { loadReleaseMetadata } from "./release-metadata.ts";

const release = loadReleaseMetadata();
if (process.env.MINIAPP_AUTO_MIGRATE === "1")
  throw new Error("release_migration_auto_migrate_forbidden");
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl || databaseUrl.startsWith("secret-ref:"))
  throw new Error("release_migration_database_url_required");

const repository = new PostgresMiniappRepository(databaseUrl);
try {
  await repository.initialize({ migrate: true });
  const readiness = await repository.readinessSnapshot();
  if (readiness.ready !== true)
    throw new Error("release_migration_schema_not_ready");
  process.stdout.write(
    `${JSON.stringify({ status: "migrated", release, schema: readiness })}\n`,
  );
} finally {
  await repository.close();
}
