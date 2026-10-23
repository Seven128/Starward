import assert from "node:assert/strict";
import test from "node:test";
import { createPrimaryNavigationController, type PrimaryNavigationState } from "./primary-navigation-controller";

const MAP = "pages/map/index", MY = "pages/my/index";
function harness() {
  const map = { route: MAP }, child = { route: "spot/search/index" };
  let current = map;
  const changes: PrimaryNavigationState[] = [];
  const controller = createPrimaryNavigationController({ currentPage: () => current, changed: state => changes.push(state) });
  return { map, child, controller, changes, setCurrent(page: { route: string }) { current = page; } };
}

test("one exact native Map show admits a logical presentation; hidden or replacement Pages cannot", () => {
  const h = harness();
  assert.equal(h.controller.openMy(), false); assert.equal(h.controller.presentationIdentity(MAP), null);
  assert.equal(h.controller.show(h.child), false);
  assert.equal(h.controller.show(h.map), true);
  assert.equal(h.controller.isForeground(MAP), true); assert.equal(h.controller.owns(h.map), true);
  const original = h.controller.presentationIdentity(MAP);
  h.setCurrent(h.child);
  assert.equal(h.controller.isForeground(MAP), false); assert.equal(h.controller.openMy(), false);
  const replacement = { route: MAP }; h.setCurrent(replacement);
  assert.equal(h.controller.show(replacement), false);
  assert.equal(h.controller.presentationIdentity(MAP), original);
});

test("My opens and closes through explicit root completion with independent activation identities", () => {
  const h = harness(); h.controller.show(h.map); const mapActivation = h.controller.presentationIdentity(MAP);
  assert.equal(h.controller.openMy(), true);
  const opening = h.controller.getSnapshot(), myActivation = h.controller.presentationIdentity(MY);
  assert.equal(opening.phase, "opening"); assert.equal(opening.route, MY); assert.equal(opening.foregroundRoute, MY);
  assert.ok(myActivation && myActivation !== mapActivation); assert.equal(h.controller.presentationIdentity(MAP), null);
  assert.equal(h.controller.finishTransition(opening.transitionTicket!), true);
  assert.equal(h.controller.getSnapshot().phase, "open");
  assert.equal(h.controller.closeMy(), true);
  const closing = h.controller.getSnapshot(); assert.equal(closing.phase, "closing"); assert.equal(closing.route, MAP);
  assert.equal(closing.foregroundRoute, null); assert.equal(h.controller.isForeground(MAP), false);
  assert.equal(h.controller.isForeground(MY), false, "exiting My cannot accept input or resume Map demands");
  assert.notEqual(h.controller.presentationIdentity(MAP), mapActivation);
  assert.equal(h.controller.presentationIdentity(MY), null);
  assert.equal(h.controller.finishTransition(closing.transitionTicket!), true);
  assert.equal(h.controller.getSnapshot().phase, "closed");
  assert.equal(h.controller.isForeground(MAP), true); assert.equal(h.controller.getSnapshot().foregroundRoute, MAP);
});

test("repeated intents are no-ops while reverse commands replace the ticket and retire late completion", () => {
  const h = harness(); h.controller.show(h.map); h.controller.openMy();
  const opening = h.controller.getSnapshot(), activation = h.controller.presentationIdentity(MY);
  assert.equal(h.controller.openMy(), false); assert.equal(h.controller.getSnapshot(), opening);
  h.controller.closeMy(); const closing = h.controller.getSnapshot();
  assert.notEqual(closing.transitionTicket, opening.transitionTicket);
  assert.equal(h.controller.isForeground(MAP), false);
  assert.equal(h.controller.finishTransition(opening.transitionTicket!), false);
  h.controller.openMy(); const reopened = h.controller.getSnapshot();
  assert.equal(h.controller.isForeground(MY), true, "reverse input can retake an exiting presentation");
  assert.notEqual(h.controller.presentationIdentity(MY), activation);
  assert.equal(h.controller.finishTransition(closing.transitionTicket!), false);
  assert.equal(h.controller.finishTransition(reopened.transitionTicket!), true);
  assert.equal(h.controller.getSnapshot().phase, "open");
});

test("native child hide/show suspends effective foreground without changing logical activation", () => {
  const h = harness(); h.controller.show(h.map); h.controller.openMy();
  const opening = h.controller.getSnapshot(), identity = h.controller.presentationIdentity(MY);
  h.setCurrent(h.child); h.controller.hide();
  assert.equal(h.controller.getSnapshot().route, MY); assert.equal(h.controller.getSnapshot().foregroundRoute, null);
  assert.equal(h.controller.isForeground(MY), false); assert.equal(h.controller.presentationIdentity(MY), identity);
  assert.equal(h.controller.closeMy(), false, "a hidden native Page cannot accept primary UI input");
  assert.equal(h.controller.finishTransition(opening.transitionTicket!), true, "a root timer may settle while its native owner is hidden");
  h.setCurrent(h.map); h.controller.show(h.map);
  assert.equal(h.controller.getSnapshot().phase, "open"); assert.equal(h.controller.isForeground(MY), true);
  assert.equal(h.controller.presentationIdentity(MY), identity);
});

test("same-page layout resynchronization neither restarts a transition nor replaces a stable snapshot", () => {
  const h = harness(); h.controller.show(h.map); h.controller.openMy();
  const opening = h.controller.getSnapshot(), identity = h.controller.presentationIdentity(MY), count = h.changes.length;
  h.controller.show(h.map); h.controller.show(h.map);
  assert.equal(h.controller.getSnapshot(), opening); assert.equal(h.changes.length, count);
  assert.equal(h.controller.presentationIdentity(MY), identity);
});

test("dispose retires ownership, transitions and scopes; subscribers can detach without affecting others", () => {
  const h = harness(); let first = 0, second = 0;
  const detach = h.controller.subscribe(() => { first++; }); h.controller.subscribe(() => { second++; });
  h.controller.show(h.map); detach(); h.controller.openMy();
  const ticket = h.controller.getSnapshot().transitionTicket!;
  assert.equal(first, 1); assert.equal(second, 2);
  h.controller.dispose(); const terminal = h.controller.getSnapshot();
  assert.equal(second, 3); assert.equal(terminal.disposed, true); assert.equal(terminal.foregroundRoute, null);
  assert.equal(h.controller.presentationIdentity(MY), null); assert.equal(h.controller.owns(h.map), false);
  assert.equal(h.controller.isForeground(MY), false); assert.equal(h.controller.show(h.map), false);
  assert.equal(h.controller.finishTransition(ticket), false); assert.equal(h.controller.openMy(), false);
  h.controller.dispose(); h.controller.hide(); assert.equal(h.controller.getSnapshot(), terminal);
  assert.equal(second, 3);
});
