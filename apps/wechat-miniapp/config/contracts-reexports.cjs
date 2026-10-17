const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Skipping a forwarding entry can skip an unused dependency's initialization.
// This hint is valid only for the audited contract graph's local declarations.
// Unknown initialization/dependencies fail rather than silently losing setup.
function assertContractReexports(source, file) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  if (parsed.parseDiagnostics.length || !parsed.statements.length ||
      parsed.statements.some(statement => !ts.isExportDeclaration(statement) ||
        !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith("./") || statement.attributes))
    throw new Error("miniapp_contract_entry_requires_pure_reexports");
}

function assertContractInitialization(entry) {
  entry = path.resolve(entry);
  const directory = path.dirname(entry), seen = new Set();
  const fail = () => { throw new Error("miniapp_contract_initialization_requires_review"); };
  function initialization(node) {
    if (ts.isFunctionLike(node) && !ts.isCallExpression(node.parent)) return;
    if (ts.isIdentifier(node) && ["globalThis", "window", "wx", "console", "process", "require", "module", "exports"].includes(node.text)) fail();
    if ((ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) || ts.isDeleteExpression(node) ||
        ts.isAwaitExpression(node) || ts.isTaggedTemplateExpression(node) ||
        ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
          [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator))) fail();
    if (ts.isCallExpression(node) && !["Object.freeze", "Object.fromEntries", "FILTER_OPTIONS.map", "FILTER_GROUPS.map"].includes(node.expression.getText())) fail();
    if (ts.isNewExpression(node) && !["Set", "WeakMap", "Error"].includes(node.expression.getText())) fail();
    ts.forEachChild(node, initialization);
  }
  function visit(file) {
    if (path.dirname(file) !== directory && !file.startsWith(directory + path.sep)) fail();
    if (seen.has(file)) return; seen.add(file);
    const parsed = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    if (parsed.parseDiagnostics.length) fail();
    function intrinsicBindings(node) {
      if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isParameter(node) ||
          ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportClause(node)) &&
          node.name && ts.isIdentifier(node.name) && ["Object", "Set", "WeakMap", "Error"].includes(node.name.text)) fail();
      ts.forEachChild(node, intrinsicBindings);
    }
    intrinsicBindings(parsed);
    for (const statement of parsed.statements) {
      if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
        if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) fail();
        const specifier = statement.moduleSpecifier.text;
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          let dependency = path.resolve(path.dirname(file), specifier);
          if (dependency.endsWith(".js") && path.extname(entry) === ".ts") dependency = dependency.replace(/\.js$/u, ".ts");
          if (!path.extname(dependency)) dependency += ".ts";
          visit(dependency);
        } else if (!["@noble/hashes/sha2.js", "@noble/hashes/utils.js"].includes(specifier) ||
            !ts.isImportDeclaration(statement) || !statement.importClause) fail();
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations)
          if (declaration.initializer) initialization(declaration.initializer);
      } else if (ts.isIfStatement(statement) && path.basename(file) === "filters.ts") {
        // Existing data schema check; no registration, I/O or global effects.
        initialization(statement);
      } else if (!ts.isFunctionDeclaration(statement) && !ts.isTypeAliasDeclaration(statement) &&
          !ts.isInterfaceDeclaration(statement)) fail();
    }
  }
  visit(entry);
}

function applyContractReexportRule(chain, file) {
  const entry = path.resolve(file);
  assertContractReexports(readFileSync(entry, "utf8"), entry);
  assertContractInitialization(entry);
  chain.module.rule("starward-contract-reexports")
    .test(resource => path.resolve(resource) === entry).sideEffects(false);
}

module.exports = { assertContractReexports, assertContractInitialization, applyContractReexportRule };
