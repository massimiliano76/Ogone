import gen from "./generator.ts";
import { Utils } from "../../../../classes/utils/index.ts";
import {
  ProtocolScriptRegExpItem,
  ProtocolScriptRegExpList,
} from "../../../../.d.ts";
import templateReplacer from "../../../../utils/template-recursive.ts";

const exportASKey: ProtocolScriptRegExpItem = {
  name: "exportAsKey",
  open: false,
  reg: /\s*([^§\{\,]*)+\s*(§{2}keywordAs\d+§{2})\s*([^§\}\,]*)+,?/,
  id: (value, matches, typedExpressions, expressions) => {
    if (!expressions || !matches) {
      throw new Error("expressions or matches are missing");
    }
    const id = `§§exportAsKey${gen.next().value}§§`;
    expressions[id] = value;
    return id;
  },
  close: false,
};
const esm: ProtocolScriptRegExpList = [
  {
    open: false,
    reg: /(\*)\s*(§{2}keywordAs\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§allAs${gen.next().value}§§`;
      expressions[id] = value;
      return id;
    },
    close: false,
  },
  {
    open: false,
    reg: /\s*(§{2}block\d+§{2})\s*/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches || !typedExpressions) {
        throw new Error("typedExpressions, expressions or matches are missing");
      }
      const id = `§§blockImport${gen.next().value}§§`;
      let [input, block] = matches;
      let expression = expressions[block];
      while (expression && expression.match(exportASKey.reg as RegExp)) {
        const exportingAliasedKey = expression.match(exportASKey.reg as RegExp);
        if (exportingAliasedKey) {
          const [input, key, as, alias] = exportingAliasedKey;
          const newexpression = ` ${key.trim()}: ${alias},`;
          expression = expression.replace(input, newexpression);
        }
      }
      /*
      if (expression.indexOf('§§') > -1) {
        const token = expression.match(/(§{2}([^§]*)+\d*§{2})/);
        const exp = expressions[token[1]];
        const UnexpectedTokenException = new SyntaxError(`Unexpected token "${exp}" in import expression`);
        throw UnexpectedTokenException;
      }
      */
      expressions[block] = expression;
      typedExpressions.blocks[block] = expression;
      expressions[id] = expression;
      return id;
    },
    close: false,
  },
  {
    name: "export default",
    open: false,
    reg:
      /(§{2}keywordExport\d+§{2})\s*(§{2}keywordDefault\d+§{2})\s*([^\s]*)+\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§export${gen.next().value}§§`;
      expressions[id] = value;
      return `exports.default = ${matches[3]}`;
    },
    close: false,
  },
  {
    name: "export vars",
    open: false,
    reg:
      /(§{2}keywordExport\d+§{2})\s*(§{2}(keywordConst|keywordLet)\d+§{2})\s*([^§])+\s*(§{2}operatorsetter\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§export${gen.next().value}§§`;
      const [input, exp, constorLet, optional, key, setter] = matches;
      expressions[id] = value;
      return `exports.${key} ${setter}`;
    },
    close: false,
  },
  {
    open: false,
    reg: /(?<!§§blockImport\d+§§)([\w]+)+\s*,/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§importCandidate${gen.next().value}§§`;
      expressions[id] = value;
      return id;
    },
    close: false,
  },
  {
    name: "aliased import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s*(§{2}allAs\d+§{2})\s+([^§]*)+\s+(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§importAllAs${gen.next().value}§§`;
      const [input, imp, allAs, key, f, id2] = matches;
      expressions[id] = value;
      const str = expressions[id2].replace(/[\s]/gi, "");
      if (typedExpressions) {
        typedExpressions.imports[key] = {
          ambient: null,
          default: null,
          block: null,
          allAs: expressions[id2].replace(/['"`]/gi, ""),
          constantDeclaration: [
            `let ${key} = Ogone.mod[${str}];`,
            `
            Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${key} = m;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
          expression: `Ogone.imp(${str}),`,
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "ambient import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s+(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, id2] = matches;
      expressions[id] = value;
      if (typedExpressions) {
        typedExpressions.imports[id] = {
          ambient: expressions[id2].replace(/['"`]/gi, ""),
          allAs: null,
          block: null,
          default: null,
          expression: `Ogone.imp(${expressions[id2]})`,
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "export default from",
    open: false,
    reg:
      /\s*(§{2}keywordExport\d+§{2})\s+([\w\d]*)+\s+(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, key, f, id2] = matches;
      expressions[id] = value;
      if (typedExpressions) {
        typedExpressions.exports[key] = {
          default: null,
          var: null,
          require: expressions[id2].replace(/['"`]/gi, ""),
        };
      }
      return `exports.${key} = require(${id2});`;
    },
    close: false,
  },
  {
    name: "default import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s+([\w\d]*)+\s+(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*((§{2}(endLine|endExpression|endPonctuation)\d+§{2}))/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, key, f, id2] = matches;
      const str = expressions[id2].replace(/[\s]/gi, "");
      expressions[id] = value;
      if (typedExpressions) {
        typedExpressions.imports[key] = {
          ambient: null,
          allAs: null,
          block: null,
          default: expressions[id2].replace(/['"\s`]/gi, ""),
          expression: `Ogone.imp(${str}),`,
          value: `import ${key} from ${str};`,
          constantDeclaration: [
            `let ${key} = Ogone.mod[${str}].default;`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${key} = m.default;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
        };
      }
      return ``;
    },
    close: false,
  },

  {
    name: "default and aliased import",
    open: false,
    reg:
      /(§{2}keywordImport\d+§{2})\s*(§{2}importCandidate\d*§{2})\s*(§{2}allAs\d+§{2})\s*([^§]*)+\s*(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, key, allAs, alias, f, id2] = matches;
      expressions[id] = value;
      const str = expressions[id2].replace(/['"\s`]/gi, "");
      if (typedExpressions) {
        typedExpressions.imports[alias.replace(/[,\s\n]/gi, "")] = {
          ambient: null,
          default: null,
          block: null,
          allAs: expressions[id2].replace(/['"`]/gi, ""),
          constantDeclaration: [
            `let ${alias} = Ogone.mod[${str}];`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${alias} = m;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
          expression: `Ogone.imp(${str}),`,
          value: `import ${alias} from ${str};`,
        };
        typedExpressions.imports[expressions[key].replace(/[,\s\n]/gi, "")] = {
          ambient: null,
          allAs: null,
          block: null,
          default: str,
          expression: `Ogone.imp(${str}),`,
          value: `import ${key} from ${str};`,
          constantDeclaration: [
            `let ${key} = Ogone.mod[${str}].default;`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${key} = m.default;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
        };
      }

      return ``;
    },
    close: false,
  },
  {
    name: "default and aliased import",
    open: false,
    reg:
      /(§{2}keywordImport\d+§{2})\s*(§{2}allAs\d*§{2})\s*(§{2}importCandidate\d+§{2})\s*([^§]*)+\s*(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, allAs, alias, key, f, id2] = matches;
      expressions[id] = value;
      const str = expressions[id2].replace(/[\s]/gi, "");
      const kAlias = expressions[alias].replace(/[,\s\n]/gi, "");
      if (typedExpressions) {
        typedExpressions.imports[kAlias] = {
          ambient: null,
          default: null,
          block: null,
          allAs: expressions[id2].replace(/['"`]/gi, ""),
          value: `import ${kAlias} from ${str};`,
          constantDeclaration: [
            `let ${kAlias} = Ogone.mod[${str}];`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${kAlias} = m;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
          expression: `Ogone.imp(${str}),`,
        };
        typedExpressions.imports[key.trim()] = {
          ambient: null,
          allAs: null,
          block: null,
          default: str,
          expression: `Ogone.imp(${str}),`,
          value: `import ${key} from ${str};`,
          constantDeclaration: [
            `let ${key} = Ogone.mod[${str}].default;`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${key} = m.default;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "object import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s*(§{2}blockImport\d+§{2})\s*(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, key, f, id2] = matches;
      expressions[id] = value;
      const str = expressions[id2].replace(/[\s]/gi, "");
      const realKey = expressions[key]
        .replace(/\n,/gi, ",")
        .replace(/,\}/gi, "}")
        .trim();
      const arr = realKey
        .replace(/^(\{)/, "[")
        .replace(/(\})$/, "]")
        .replace(/([\w]+)+/gi, "'$1'");
      const arrayOfKey = eval(arr);
      if (typedExpressions) {
        typedExpressions.imports[realKey] = {
          ambient: null,
          default: null,
          allAs: null,
          block: expressions[id2].replace(/['"`]/gi, ""),
          expression: `Ogone.imp(${str}),`,
          value: `import ${realKey} from ${str};`,
          constantDeclaration: arrayOfKey
            .map((prop: string) => [
              `let ${prop} = Ogone.mod[${str}].${prop};`,
              `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${prop} = m.${prop};
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
            ])
            .flat(),
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "default and object import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s*(§{2}blockImport\d+§{2})\s*([^§]*)+\s*(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, key, def, f, id2] = matches;
      const kDef = def.replace(/[,\s\n]/gi, "");
      const str = expressions[id2].replace(/[\s]/gi, "");
      const realKey = expressions[key]
        .replace(/\n,/gi, ",")
        .replace(/,\}/gi, "}")
        .trim();
      const arr = realKey
        .replace(/^(\{)/, "[")
        .replace(/(\})$/, "]")
        .replace(/([\w]+)+/gi, "'$1'");
      const arrayOfKey = eval(arr);
      if (typedExpressions) {
        typedExpressions.imports[realKey] = {
          ambient: null,
          default: null,
          allAs: null,
          block: expressions[id2].replace(/['"`]/gi, ""),
          expression: `Ogone.imp(${str}),`,
          value: `import ${realKey} from ${str};`,
          constantDeclaration: arrayOfKey
            .map((prop: string) => [
              `let ${prop} = Ogone.mod[${str}].${prop};`,
              `
            Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${prop} = m.${prop};
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
            ])
            .flat(),
        };
        typedExpressions.imports[kDef.trim()] = {
          ambient: null,
          allAs: null,
          block: null,
          default: str,
          value: `import ${kDef} from ${str};`,
          expression: `Ogone.imp(${str}),`,
          constantDeclaration: [
            `let ${kDef} = Ogone.mod[${str}].default;`,
            `Ogone.mod['*'].push([${str}, (m) => {
              if (!this.activated) return false;
              ${kDef} = m.default;
              this.runtime('destroy');
              this.runtime(0);
              return this.activated;
            }]);
          `,
          ],
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "default and object import",
    open: false,
    reg:
      /\s*(§{2}keywordImport\d+§{2})\s*(§{2}importCandidate\d+§{2})\s*(§{2}blockImport\d+§{2})\s*(§{2}keywordFrom\d+§{2})\s*(§{2}string\d+§{2})\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})?/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§import${gen.next().value}§§`;
      const [input, imp, def, key, f, id2] = matches;
      if (typedExpressions) {
        typedExpressions.imports[expressions[def].replace(/[,\s\n]/gi, "")] = {
          ambient: null,
          block: null,
          allAs: null,
          default: expressions[id2].replace(/['"`]/gi, ""),
          expression: `import ${
            expressions[def].replace(
              /[,\s\n]/gi,
              "",
            )
          } from ${
            expressions[id2]
              .replace(/[\s]/gi, "")
          }`,
        };
        typedExpressions.imports[
          expressions[key].replace(/\n,/gi, ",").replace(/,\}/gi, "}")
        ] = {
          ambient: null,
          default: null,
          allAs: null,
          block: expressions[id2].replace(/['"`]/gi, ""),
          expression: `import ${
            expressions[key]
              .replace(/\n,/gi, ",")
              .replace(/,\}/gi, "}")
          } from ${
            expressions[id2]
              .replace(/[\s]/gi, "")
          };`,
        };
      }
      return ``;
    },
    close: false,
  },
  {
    name: "fallback import",
    open: false,
    reg: /(§{2}keywordImport\d+§{2})([^\s\S]*)+/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      throw new Error(
        `this syntax of import is not supported\ninput:${
          templateReplacer(value, expressions)
        }`,
      );
    },
    close: false,
  },
];

export default esm;
