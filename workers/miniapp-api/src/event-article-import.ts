import { createHash } from "node:crypto";
import type { AstronomicalEventArticle, AstronomicalEventOccurrence, SourceSummary } from "@starward/miniapp-contracts";
import type { AstronomicalEventCatalogOwner, EventCatalogActiveIdentity } from "./astronomical-event-catalog-owner.ts";
import type { EventArticleRightsConfirmation } from "./event-article-policy.ts";
import { validateEventArticle } from "./event-article-policy.ts";

export interface EventArticleImport {
  occurrenceId: string;
  catalogVersion: string;
  expectedActive: EventCatalogActiveIdentity;
  article: Omit<AstronomicalEventArticle, "sourceId"> | null;
  license: string;
  rights: EventArticleRightsConfirmation;
}

/** Adds/removes editorial text on one frozen baseline, through the existing publication owner. */
export async function importEventArticle(owner: AstronomicalEventCatalogOwner, input: EventArticleImport, actorId: string) {
  const expected = input.expectedActive;
  const identity = owner.activeIdentity();
  if (!expected || expected.catalogVersion !== identity.catalogVersion || expected.contentSha256 !== identity.contentSha256) throw new Error("event_catalog_active_changed");
  const catalog = owner.snapshot();
  const target = catalog.events.find(event => event.occurrenceId === input.occurrenceId);
  if (!target) throw new Error("astronomical_event_not_found");
  let article: AstronomicalEventArticle | undefined;
  let articleSource: SourceSummary | undefined;
  if (input.article !== null) {
    const config = input.rights ? await owner.store.getSourceConfig(input.rights.registeredSourceId) : null;
    if (!config?.enabled) throw new Error("event_article_registered_source_required");
    if (typeof input.license !== "string" || !input.license.trim() || input.license.length > 300) throw new Error("event_article_license_invalid");
    const id = `source:article:${createHash("sha256").update(`${input.occurrenceId}:${input.article?.originalUrl}`).digest("hex").slice(0, 24)}`;
    article = { ...input.article, sourceId: id };
    validateEventArticle(article);
    articleSource = {
      id, kind: "EDITORIAL_REFERENCE", provider: config.provider, title: article.title, sourceUrl: article.originalUrl,
      license: input.license.trim(), licenseUrl: config.termsUrl,
      // Date-only/unknown-time metadata remains on the article; never invent an instant.
      publishedAt: article.publishedTime && /T.*(?:Z|[+-]\d\d:\d\d)$/u.test(article.publishedTime) && Number.isFinite(Date.parse(article.publishedTime)) ? article.publishedTime : null,
      retrievedAt: article.retrievedAt, validFrom: null, validTo: null, state: "FRESH", confidence: null,
      precision: "经审核的文章补充资料", limitations: [],
    };
  }
  const events: AstronomicalEventOccurrence[] = catalog.events.map(event => {
    if (event.occurrenceId !== target.occurrenceId) return event;
    const { article: _old, ...base } = event;
    return article ? { ...base, article } : base;
  });
  const retiredSource = target.article?.sourceId;
  const sources = catalog.sources.filter(source => source.id !== articleSource?.id && (source.id !== retiredSource || events.some(event => event.sourceId === source.id || event.article?.sourceId === source.id)));
  if (articleSource) sources.push(articleSource);
  const rights = { ...catalog.articleRights };
  delete rights[target.occurrenceId];
  // The candidate can be reviewed after a concurrent publication, but this form
  // must not silently replace edits made since the operator opened it.
  if (owner.activeIdentity().contentSha256 !== identity.contentSha256) throw new Error("event_catalog_active_changed");
  return owner.importCandidate({ sourceId: input.rights?.registeredSourceId ?? target.sourceId ?? "source:editorial",
    actorId, articleRightsConfirmation: input.rights,
    package: { ...catalog, catalogVersion: input.catalogVersion, events, sources, articleRights: rights },
  });
}
