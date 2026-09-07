const { sources } = require("webpack");

// Taro 4.2 retains these values in hydrate/setAttribute payloads but the WeChat
// template omits them. Bind the existing payload; do not invent a second store.
const BINDINGS = {
  "aria-label": "i.ariaLabel",
  "aria-role": "i.ariaRole || i.role",
  "aria-hidden": "i.ariaHidden",
  "aria-expanded": "i.ariaExpanded",
};
function bindAccessibility(template) {
  return template.replace(/<(?:view|text|image|button|input|textarea|picker|scroll-view)\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*>/g, tag => {
    if (!tag.includes('data-sid="{{i.sid}}"')) return tag;
    const additions = Object.entries(BINDINGS)
      .filter(([attribute]) => !new RegExp(`\\s${attribute}=`).test(tag))
      .map(([attribute, value]) => ` ${attribute}="{{${value}}}"`).join("");
    return tag.replace(/(\/?>)$/, `${additions}$1`);
  });
}
module.exports = ctx => {
  ctx.modifyBuildAssets(({ assets }) => {
    for (const [name, asset] of Object.entries(assets)) {
      if (!name.endsWith(".wxml")) continue;
      const original = asset.source().toString(), updated = bindAccessibility(original);
      if (updated !== original) assets[name] = new sources.RawSource(updated);
    }
  });
};
module.exports.bindAccessibility = bindAccessibility;
