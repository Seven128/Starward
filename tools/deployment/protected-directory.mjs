// Shared Linux directory ownership and descriptor lifetime for fixed host
// observations. Keep this factory self-contained: both generated programs embed
// this exact implementation rather than loading a historical control checkout.
export function createProtectedDirectoryBoundary({ fs, constants, path, uid }) {
  const fail = code => { throw new Error(code); };
  const directories = new Map();
  const canonical = selected => typeof selected === "string" && selected.length <= 4096 && /^\/[A-Za-z0-9._/-]+$/u.test(selected) && selected !== "/" && path.normalize(selected) === selected && selected.split("/").length <= 64 && !selected.split("/").some(part => part === "." || part === "..");
  const same = (first, second) => ["dev", "ino", "mode", "uid", "gid", "nlink"].every(key => first[key] === second[key]);
  const check = stat => {
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("directory_invalid");
    if (stat.uid !== 0n && stat.uid !== BigInt(uid)) fail("ownership_invalid");
    if ((stat.mode & 0o022n) !== 0n) fail("permissions_invalid");
  };
  const hold = async selected => {
    if (selected !== "/" && !canonical(selected)) fail("path_invalid");
    let directory = "/", parent;
    for (const component of ["", ...selected.split("/").slice(1)]) {
      if (component) directory = path.join(directory, component);
      const before = await fs.lstat(directory, { bigint: true }); check(before);
      const old = directories.get(directory);
      if (old) {
        const held = await old.handle.stat({ bigint: true }); check(held);
        if (!same(old.stat, before) || !same(old.stat, held)) fail("changed");
        parent = old;
      } else {
        const anchored = parent ? `/proc/self/fd/${parent.handle.fd}/${component}` : "/";
        const handle = await fs.open(anchored, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const stat = await handle.stat({ bigint: true }); check(stat);
          const after = await fs.lstat(directory, { bigint: true }); check(after);
          if (!Number.isInteger(handle.fd) || handle.fd < 0 || !same(before, stat) || !same(stat, after)) fail("changed");
          parent = { stat, handle }; directories.set(directory, parent);
        } catch (error) { await handle.close(); throw error; }
      }
    }
    return parent;
  };
  const recheckAll = async () => {
    for (const [selected, previous] of directories) {
      const after = await fs.lstat(selected, { bigint: true }); check(after);
      const held = await previous.handle.stat({ bigint: true }); check(held);
      if (!same(previous.stat, after) || !same(previous.stat, held)) fail("changed");
    }
  };
  const close = async () => {
    let failure;
    for (const { handle } of [...directories.values()].reverse()) {
      try { await handle.close(); } catch (error) { failure ??= error; }
    }
    directories.clear();
    if (failure) throw failure;
  };
  return { canonical, same, check, hold, recheckAll, close };
}
