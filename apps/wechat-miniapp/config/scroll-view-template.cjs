const { sources } = require("webpack");

function stripDefaultScrollPadding(template) {
  return template.replace(/<scroll-view\b[^>]*>/g, (tag) =>
    tag.replace(/\s+padding="\{\{i\.[\w$]+\|\|\[0,0,0,0\]\}\}"/g, ""));
}

module.exports = (ctx) => {
  ctx.modifyBuildAssets(({ assets }) => {
    for (const [name, asset] of Object.entries(assets)) {
      if (!name.endsWith(".wxml")) continue;
      const original = asset.source().toString();
      const updated = stripDefaultScrollPadding(original);
      if (updated !== original) assets[name] = new sources.RawSource(updated);
    }
  });
};
module.exports.stripDefaultScrollPadding = stripDefaultScrollPadding;
