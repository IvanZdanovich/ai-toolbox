// Spec titles, executable rather than prose: every case title carries the
// subject it covers and the Gherkin keyword for its level, so `vitest run`
// output alone says what is covered and what broke.
//
//   describe (outer)  Subject.Component: Given <preconditions>
//   describe (nested) Subject.Component: When <condition>
//   it / test         Subject.Component: Then <expected result>
//
// The first dotted segment is checked against the spec's own file name, so
// the vocabulary stays derivable from the tree rather than from a hand-kept
// catalogue (SELF_DESCRIBING). The patterns live here rather than in
// `chrome-extension/constraints/`: they govern `reqs/` only, and nothing the
// extension ships has to agree with them (NOT_EVERY_LITERAL).
//
// Origin: layout.adr-7.

const SUBJECT = String.raw`[A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*){0,3}`;

const KEYWORD_BY_ROLE = {
  given: 'Given',
  when: 'When',
  then: 'Then',
};

const PATTERN_BY_ROLE = {
  given: new RegExp(`^${SUBJECT}: Given \\S.{0,199}(?<!\\s)$`),
  when: new RegExp(`^${SUBJECT}: When \\S.{0,199}(?<!\\s)$`),
  then: new RegExp(`^${SUBJECT}: Then \\S.{0,199}(?<!\\s)$`),
};

const SUITE_NAMES = new Set(['describe', 'suite']);
const CASE_NAMES = new Set(['it', 'test']);

// `describe`, `describe.skip`, `describe.each([...])`, `it.each(...)(...)`.
function blockName(node) {
  let callee = node.callee;
  if (callee.type === 'CallExpression') {
    callee = callee.callee;
  }
  while (
    callee.type === 'MemberExpression' ||
    callee.type === 'TaggedTemplateExpression'
  ) {
    callee = callee.type === 'MemberExpression' ? callee.object : callee.tag;
  }
  return callee.type === 'Identifier' ? callee.name : null;
}

function titleNode(node) {
  const [first] = node.arguments;
  if (!first) {
    return null;
  }
  if (first.type === 'Literal' && typeof first.value === 'string') {
    return { node: first, title: first.value };
  }
  if (first.type === 'TemplateLiteral' && first.expressions.length === 0) {
    return { node: first, title: first.quasis[0].value.cooked };
  }
  // A computed title cannot be checked statically; the block is skipped.
  return null;
}

function roleOf(node, sourceCode) {
  const name = blockName(node);
  if (CASE_NAMES.has(name)) {
    return 'then';
  }
  if (!SUITE_NAMES.has(name)) {
    return null;
  }
  const nested = sourceCode
    .getAncestors(node)
    .some((a) => a.type === 'CallExpression' && SUITE_NAMES.has(blockName(a)));
  return nested ? 'when' : 'given';
}

// `reqs/unit/shared/template-manager.spec.js` -> `templatemanager`, the
// comparison form of the subject the spec is named after.
function subjectOfFile(filename) {
  const base = filename.split(/[\\/]/).pop();
  return base.split('.')[0].replace(/-/g, '').toLowerCase();
}

const gherkinTitle = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'every describe/it title states its subject and the Gherkin keyword for its level',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      CallExpression(node) {
        const role = roleOf(node, sourceCode);
        if (!role) {
          return;
        }
        const title = titleNode(node);
        if (!title) {
          return;
        }
        if (!PATTERN_BY_ROLE[role].test(title.title)) {
          context.report({
            node: title.node,
            message: `Title "${title.title}" must read "Subject.Component: ${KEYWORD_BY_ROLE[role]} <${role === 'then' ? 'expected result' : role === 'when' ? 'condition' : 'preconditions'}>".`,
          });
        }
      },
    };
  },
};

const titleSubject = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "a title's first dotted segment names the module the spec file is named after",
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const expected = subjectOfFile(context.filename ?? context.getFilename());
    return {
      CallExpression(node) {
        if (!roleOf(node, sourceCode)) {
          return;
        }
        const title = titleNode(node);
        if (!title) {
          return;
        }
        const [prefix] = title.title.split(':');
        const [first] = prefix.trim().split('.');
        if (first.toLowerCase() !== expected) {
          context.report({
            node: title.node,
            message: `Title "${title.title}" starts with "${first}", but this file covers "${expected}"; a case names the subject it indicts.`,
          });
        }
      },
    };
  },
};

const noDuplicateTitle = {
  meta: {
    type: 'problem',
    docs: {
      description: 'no two blocks in a file carry the same title',
    },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const seen = new Map();
    return {
      CallExpression(node) {
        if (!roleOf(node, sourceCode)) {
          return;
        }
        const title = titleNode(node);
        if (!title) {
          return;
        }
        const previous = seen.get(title.title);
        if (previous !== undefined) {
          context.report({
            node: title.node,
            message: `Title "${title.title}" already appears on line ${previous}; a duplicate title cannot identify which rule failed.`,
          });
          return;
        }
        seen.set(title.title, title.node.loc.start.line);
      },
    };
  },
};

const plugin = {
  rules: {
    'gherkin-title': gherkinTitle,
    'title-subject': titleSubject,
    'no-duplicate-title': noDuplicateTitle,
  },
};

export default {
  files: [
    'reqs/unit/**/*.spec.js',
    'reqs/integration/**/*.spec.js',
    'reqs/e2e/**/*.spec.js',
    'reqs/cross/**/*.spec.js',
  ],
  plugins: { 'spec-titles': plugin },
  rules: {
    'spec-titles/gherkin-title': 'error',
    'spec-titles/title-subject': 'error',
    'spec-titles/no-duplicate-title': 'error',
  },
};
