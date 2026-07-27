// Keep the route context project-relative so production and isolated candidate
// snapshots discover the same Expo Router app tree when dependencies are linked.
export const ctx = require.context(
  "./app",
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
  "sync",
);
