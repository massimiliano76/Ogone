import gen from "./generator.ts";
import templateReplacer from "../../../../utils/template-recursive.ts";
import { Utils } from "../../../../classes/utils/index.ts";
import { ProtocolScriptRegExpList, MapIndexable } from "../../../../.d.ts";
let rid = 0;
export function translateReflection(
  { body, identifier }: { body: string; identifier: string },
) {
  const cases: string[] = [];
  const getPropertyRegExpGI = /(this\.)([\w\.]*)+/gi;
  const getPropertyRegExp = /(this\.)([\w\.]*)+/;
  const a = body.match(getPropertyRegExpGI);
  const b = identifier.match(getPropertyRegExpGI);
  const array = [...(a ? a : []), ...(b ? b : [])];
  const n = identifier.replace(/^(\.)/, "");
  if (array.length) {
    array.forEach((thisExpression) => {
      const m = thisExpression.match(
        getPropertyRegExp,
      );
      if (m) {
        const [input, keywordThis, property] = m;
        const key: string = `'update:${property.replace(/^(\.)/, "")}'`;
        if (!cases.includes(key)) {
          cases.push(key);
        }
      }
    });
    return `
      if ([${cases}].includes(_state) || _state === 0) {
        this${identifier} = (() => ${body})();____("${n}", this);
      }`;
  } else {
    return `
      if (_state === 0) {
        this${identifier} = (() => ${body})();____("${n}", this);
      }`;
  }
}
const items: ProtocolScriptRegExpList = [
  // reflection regexp this.name => {};
  // reflection is the same feature for computed datas but with the following syntax
  // this.reflected => { return Math.random() };
  // TODO
  {
    name: "reflection",
    open: false,
    reg:
      /(§{2}keywordThis\d+§{2})\s*((§{2}(identifier|array)\d+§{2})+)\s*(§{2}arrowFunction\d+§{2})\s*(§{2}block\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches || !typedExpressions) {
        throw new Error(
          "typedExpressions or expressions or matches are missing",
        );
      }
      const id = `§§reflection${gen.next().value}§§`;
      const [input, keywordThis, identifier] = matches;
      const fnbody = matches.find(
        (k, i, arr) => arr[i - 1] && arr[i - 1].startsWith("§§arrowFunction"),
      );
      if (expressions) expressions[id] = value;
      let translate = fnbody;
      let translateIdentifier = identifier;
      function template() {
        translate = templateReplacer(translate, expressions as MapIndexable);
        translateIdentifier = templateReplacer(
          translateIdentifier,
          expressions as MapIndexable,
        );
      }
      template();
      translate = translateReflection({
        body: translate as string,
        identifier: translateIdentifier,
      });
      template();
      typedExpressions.reflections.push(translate);
      return "";
    },
    close: false,
  },
  {
    name: "reflection",
    open: false,
    reg:
      /(§{2}keywordThis\d+§{2})\s*((§{2}(identifier|array)\d+§{2})+)\s*(§{2}arrowFunction\d+§{2})\s*([^\s]+)+\s*(§{2}(endLine|endExpression|endPonctuation)\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches || !typedExpressions) {
        throw new Error(
          "typedExpressions or expressions or matches are missing",
        );
      }
      const id = `§§reflection${gen.next().value}§§`;
      const [input, keywordThis, identifier] = matches;
      const fnbody = matches.find(
        (k, i, arr) => arr[i - 1] && arr[i - 1].startsWith("§§arrowFunction"),
      );
      if (expressions) expressions[id] = value;
      if (fnbody) {
        let translate = fnbody.replace(/(§§endPonctuation\d+§§)/gi, "");
        let translateIdentifier = identifier;
        function template() {
          translate = templateReplacer(translate, expressions as MapIndexable);
          translateIdentifier = templateReplacer(
            translateIdentifier,
            expressions as MapIndexable,
          );
        }
        template();
        translate = translateReflection({
          body: translate,
          identifier: translateIdentifier,
        });
        template();
        typedExpressions.reflections.push(translate);
      }
      return "";
    },
    close: false,
  },
  {
    name: "reflection",
    open: false,
    reg:
      /(§{2}keywordThis\d+§{2})\s*(§{2}identifier\d+§{2})\s*(§{2}arrowFunction\d+§{2})\s*([^\s]+)+/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const UpsupportedReflectionSyntax = new Error(
        `[Ogone] Unsupported syntax of reflection.
${value}
not supported in this version of Ogone
      `,
      );
      return "";
    },
    close: false,
  },
  // use syntax
  // use @/path/to/comp.o3 as element-name
  {
    // parse missing string
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s*(§{2}path\d+§{2})\s*(§{2}keywordAs\d+§{2})\s+(?!(§§string))/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      throw new Error(
        "please follow this pattern for use expression: use @/absolute/path.o3 as <string>\n\n",
      );
    },
    close: false,
  },
  // use relative path
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s*((§{2}ponctuation)([^\s]*)+)\s*(§{2}keywordAs\d+§{2})\s*(§{2}string\d+§{2})(\s*§{2}endPonctuation\d+§{2})*/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§use${gen.next().value}§§`;
      let path = templateReplacer(matches[2], expressions);
      path = templateReplacer(path, expressions).trim();
      if (typedExpressions) {
        typedExpressions.use[id] = {
          path,
          as: expressions[matches[6]],
          type: "relative",
        };
      }
      return "";
    },
    close: false,
  },
  // use absolute path
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s+(§{2}path\d+§{2})\s+(§{2}keywordAs\d+§{2})\s*(§{2}string\d+§{2})(\s*§{2}endPonctuation\d+§{2})*/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§use${gen.next().value}§§`;
      let path = expressions[matches[2]];
      path = templateReplacer(path, expressions);
      if (typedExpressions) {
        typedExpressions.use[id] = {
          path,
          as: expressions[matches[4]],
          type: "absolute",
        };
      }
      return "";
    },
    close: false,
  },
  // use remotes components
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s+((https|http)(§{2}optionDiviser\d+§{2}\/{2})([^\s]*)+)\s+(§{2}keywordAs\d+§{2})\s*(§{2}string\d+§{2})(\s*§{2}endPonctuation\d+§{2})*/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§use${gen.next().value}§§`;
      let path = templateReplacer(matches[2], expressions);
      if (typedExpressions) {
        typedExpressions.use[id] = {
          path,
          as: expressions[matches[7]],
          type: "remote",
        };
      }
      return "";
    },
    close: false,
  },
  {
    name: "declarations",
    open: false,
    reg: /(§{2}keywordUse\d+§{2})(.*)(\s*§{2}endLine\d+§{2})*/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches) {
        throw new Error("expressions or matches are missing");
      }
      throw new Error(`
      this syntax of use is not supported, on this version.
      input: ${templateReplacer(value, expressions)}
      `);
    },
    close: false,
  },
  // require syntax
  // require prop as constructor || any
  // require prop1, prop2 as constructor[]
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordRequire\d+§{2})\s*([^\§\(]*)+(§{2}keywordAs\d+§{2})\s*([^\§\[\]]*)+(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches || !typedExpressions) {
        throw new Error("expressions or matches are missing");
      }
      const id = `§§require${gen.next().value}§§`;
      const any = null;
      const isAlreadyRequired = typedExpressions.properties.find(
        ([key]) => key === matches[2],
      );
      if (isAlreadyRequired) {
        throw new Error(
          `property ${matches[2]} is already required in component`,
        );
      }
      const array = matches[2].split(",");
      if (array.length === 1) {
        typedExpressions.properties.push([array[0].trim(), [matches[4]]]);
      } else {
        array.forEach((key) => {
          typedExpressions.properties.push([key.trim(), [matches[4]]]);
        });
      }
      return "";
    },
    close: false,
  },
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordRequire\d+§{2})\s*([^\§]*)+(§{2}keywordAs\d+§{2})\s*(§{2}array\d+§{2})\s*(§{2}endLine\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      if (!expressions || !matches || !typedExpressions) {
        throw new Error("expressions or matches are missing");
      }
      const keys = matches[2].replace(/\s/gi, "").split(",");
      const props: [string, string[]][] = keys.map((key) => {
        const isAlreadyRequired = typedExpressions.properties.find(
          ([key2]) => key2 === key,
        );
        if (isAlreadyRequired) {
          throw new Error(
            `property ${key} is already required in component`,
          );
        }
        return [
          key,
          eval(expressions[matches[4]])
            .filter((f: any) => f)
            .map((f: any) => f.name),
        ];
      });
      typedExpressions.properties.push(...props);
      return "";
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg:
      /\s*(\*){0,1}execute\s+(§{2}keywordDefault\d+§{2})\s*(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, match, typedExpressions, expressions) => {
      if (!expressions || !match) {
        throw new Error("expressions or matches are missing");
      }
      const [inpute, runOnce] = match;
      if (!runOnce) {
        rid++;
        return `_once !== ${rid} ? ____r(0, [], ${rid}) : null; return;`;
      }
      return `____r(0, [], _once || null); return;`;
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg: /\s*(\*){0,1}execute\s+(§{2}(keywordDefault|keywordCase)\d+§{2})\s*/,
    id: (value, match, typedExpressions, expressions) => {
      if (!expressions || !match) {
        throw new Error("expressions or matches are missing");
      }
      throw new Error(`
      the following syntax is not supported\n
        please one of those syntaxes:
          execute case 'casename' use [ctx, event];
          execute case 'casename';
          execute default;
        It assumes that cases are strings in proto.
        It can change in the future, do not hesitate to make a pull request on it.
      `);
    },
    close: false,
  },
];

export default items;
