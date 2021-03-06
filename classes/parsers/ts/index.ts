import gen from "./src/generator.ts";
import { YAML } from "../../../deps.ts";
import getTypedExpression from "./src/typedExpressions.ts";
import elements from "./src/elements.ts";
import computedExp from "./src/computed.ts";
import esmElements from "./src/esm.ts";
import cjsElements from "./src/cjsElements.ts";
import notParsedElements from "./src/not-parsed.ts";
import O3Elements from "./src/o3-elements.ts";
import templateReplacer from "../../../utils/template-recursive.ts";
import { Utils } from "../../utils/index.ts";
import {
  TypedExpressions,
  ProtocolScriptRegExpList,
  ProtocolScriptParserOptions,
  ProtocolScriptParserReturnType,
} from "../../../.d.ts";

/**
* class to parse custom script for Ogone
* this class will parse the setters statements
* and add some features like: reflections, execute default, before-each statement, def's Area
*/

export default class ProtocolScriptParser extends Utils {
  private parseBeforeCases(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }): string {
    const { value, typedExpressions, expressions } = opts;
    let result = value;
    const matches = value.match(
      /([^\n\r]+){0,1}(before-(each|case\s[^\:]+))/gi,
    );
    if (!matches) return result;
    const p = value.split(/(def|case[^:]+|default|before\s*[^:]+)\s*\:/gi);
    matches.forEach((m) => {
      let data = p.find((el, i, arr) => arr[i - 1] && arr[i - 1] === m.trim());
      let before = p.find((el, i, arr) => arr[i + 1] && arr[i + 1] === data);
      const content = `${m}:${data}`;
      result = result.replace(content, "");
      // reflection
      data = this.read(
        {
          typedExpressions,
          expressions,
          value: data as string,
          array: notParsedElements,
        },
      );
      data = this.read(
        {
          typedExpressions,
          expressions,
          array: elements,
          value: data,
        },
      );

      data = this.read(
        { typedExpressions, expressions, array: computedExp, value: data },
      );
      // data = renderSetterExpression(typedExpressions, expressions, data);
      data = data.replace(
        /((chainedLine|parenthese|array|functionCall)\d*§{2})\s*(§{2}keyword)/gi,
        "$1§§endExpression0§§$3",
      );
      data = this.read(
        { typedExpressions, expressions, value: data, array: O3Elements },
      );
      data = templateReplacer(data, expressions);
      if (m.trim() === "before-each") {
        typedExpressions.switch.before.each = data;
      } else if (before) {
        typedExpressions.switch.before.cases[before] = data;
      }
    });
    return result;
  }

  private parseCases(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }): string {
    const { value, typedExpressions, expressions } = opts;
    let str2: string = value;
    let result: string[] | null;
    const reg: RegExp = /(?<=(case\s*))(([^\:]*)+)(?=:)/gi;
    // preserve truth
    // is required because (0 ? 0 : 1)
    const regT: RegExp = /\?([^\:]*)+:/;

    while (str2.match(regT)) {
      const match = str2.match(regT);
      if (match) {
        const [input, point, value] = match;
        const key = `§§leftMemberTern${gen.next().value}§§`;
        expressions[key] = input;
        str2 = str2.replace(input, key);
      }
    }
    // get the matching cases
    result = str2.match(reg);
    if (result) {
      result = result.map((s) => {
        let sr = s;
        sr = templateReplacer(sr, expressions).trim();
        return sr;
      });
      typedExpressions.switch.cases.push(...result);
    }
    typedExpressions.switch.default = !!str2.match(/default([\s\n])*\:/);
    return str2;
  }
  private parseDefinitionsArea(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }) {
    const { value, typedExpressions, expressions } = opts;
    let result = value;
    const matches = value
      .replace(/([\'\"\`])([^\1]*)+(\1)/gi, "")
      .match(/([^\n\r]+){0,1}(def\s*:)/gi);
    let previousDefinition: string[] = [];
    if (matches) {
      matches.forEach((dec) => {
        if (previousDefinition.includes(dec.replace(/\s/gi, "").trim())) {
          this.error(
            'double declaration of "def:" in component',
          );
        }
        previousDefinition.push(dec.replace(/\s/gi, "").trim());
        return;
      });
    }
    /**
     * TODO
     * parse when def: is inside a quote ['`"]
     */
    const p = value.split(
      /(def|declare\s*|case[^:]+|default|before-each)\s*\:/gi,
    );
    let data = p.find((el: string, i: number, arr: string[]) =>
      arr[i - 1] && arr[i - 1] === "def"
    );
    if (!data) return result;
    let def = p.find((el: string, i: number, arr: string[]) =>
      arr[i + 1] && arr[i + 1] === data
    );
    let previous = data;
    data = templateReplacer(data, expressions);
    const definition = `${def}:${previous}`;
    const yaml = YAML.parse(data, {});
    result = result.replace(definition, "");
    // #REL1
    typedExpressions.data = yaml;
    return result;
  }
  private transformSetStatements(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }) {
    const {
      typedExpressions,
      expressions,
      value,
    } = opts;
    let result = value;
    const reg = /(§§keywordThis\d+§§)\s*(§§(identifier||array)\d+§§)/gi;
    const matches = result.match(reg);
    if (!matches) return result;
    matches.forEach((input) => {
      const match = input.match(
        /(§§keywordThis\d+§§)\s*(§§(identifier||array)\d+§§)/,
      );
      if (match) {
        const key = match[2];
        const value = expressions[key];
        typedExpressions.setters[key] = value;
      }
    });
    return result;
  }
  private setInvalidations(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }) {
    const { value, typedExpressions, expressions } = opts;

    let result = value.replace(
      /(chainedLine\d*§{2})\s*(§{2}keyword)/gi,
      "$1§§endExpression0§§$2",
    )
      .replace(/(§{2})(\})/gi, "$1§§endExpression0§§$2");
    result.split(/(§{2}(endLine|endPonctuation|endExpression)\d+§{2})/gi)
      .filter((exp) => {
        return exp.length && exp.indexOf("endLine") < 0 && (
          exp.indexOf("operatorsetter") > -1 ||
          exp.indexOf("operatorDoubleIncrease") > -1 ||
          exp.indexOf("operatorDoubleDecrease") > -1 ||
          exp.match(
            /(§{2}keywordThis\d*§{2})\s*(§{2}identifier\d*§{2})\s*(§{2}chainedLine\d*§{2})+/,
          ) ||
          exp.match(
            /(§{2}keywordThis\d*§{2})\s*(§{2}identifier\d*§{2})\s*(§{2}arrayModifier\d*§{2})+/,
          ) ||
          (exp.indexOf("arrayModifier") > -1 && exp.indexOf("keywordThis") > -1)
        );
      })
      .map((exp) => {
        const key = Object.keys(typedExpressions.setters).find((key) =>
          exp.indexOf(key) > -1
        );
        if (!key) return;
        const name = key && key.startsWith("§§array")
          ? key
          : `'${expressions[key].replace(/(§{2}ponctuation\d*§{2})/, "")}'` ||
            "";
        result = result.replace(
          exp,
          `${exp.replace(/(§§endPonctuation\d+§§)$/, "")}; ____(${name}, this)`,
        );
      });
    return result;
  }
  public read(
    opts: {
      typedExpressions: TypedExpressions;
      expressions: any;
      value: string;
      name?: string;
      array: ProtocolScriptRegExpList;
      before?: (str: string) => string;
    },
  ) {
    const {
      typedExpressions,
      expressions,
      value,
      name,
      array,
      before,
    } = opts;
    let result: string = before ? before(value) : value;
    array.forEach((item) => {
      if (name && !item.name) return;
      if (name && item.name && name !== item.name) return;
      if (item.open && item.close && item.id && item.pair) {
        while (
          // we need to parse if the character is alone or not
          // no need to change it if it's not
          !((result.split(item.open as string).length - 1) % 2) &&
          result.indexOf(item.open as string) > -1 &&
          result.indexOf(item.close as string) > -1 &&
          result.match(item.reg as RegExp)
        ) {
          const matches = result.match(item.reg as RegExp);
          const value = matches ? matches[0] : null;
          if (matches && value) {
            result = result.replace(
              item.reg as RegExp,
              item.id(value, matches, typedExpressions, expressions),
            );
          }
        }
        return;
      }
      if (item.open && item.close && item.id && !item.pair) {
        while (
          result.indexOf(item.open as string) > -1 &&
          result.indexOf(item.close as string) > -1 &&
          result.match(item.reg as RegExp)
        ) {
          const matches = result.match(item.reg as RegExp);
          const value = matches ? matches[0] : null;
          if (matches && value) {
            result = result.replace(
              item.reg as RegExp,
              item.id(value, matches, typedExpressions, expressions),
            );
          }
        }
        return;
      }
      if (item.open === false && item.close === false && item.id) {
        while (result.match(item.reg as RegExp)) {
          const matches = result.match(item.reg as RegExp);
          const value = matches ? matches[0] : null;
          if (matches && value) {
            result = result.replace(
              item.reg as RegExp,
              item.id(value, matches, typedExpressions, expressions),
            );
          }
        }
      }
      if (item.split && item.splittedId) {
        while (
          result.indexOf(item.split[0]) > -1 &&
          result.indexOf(item.split[1]) > -1
        ) {
          const exp: string = result.split(item.split[0])[1];
          const all = `${item.split[0]}${exp.split(item.split[1])[0]}${
            item.split[1]
          }`;
          result = result.replace(
            all,
            item.splittedId(result, expressions),
          );
        }
      }
    });
    return result;
  }
  public parse(
    str: string,
    opts: ProtocolScriptParserOptions,
  ): ProtocolScriptParserReturnType {
    let typedExpressions = getTypedExpression();

    let expressions = {
      "§§endExpression0§§": "\n",
    };
    let prog = `\n${str}`;
    prog = this.readDeclare({ typedExpressions, expressions, value: prog })
      .trim();
    prog = this.read({
      array: notParsedElements,
      expressions,
      value: prog,
      typedExpressions,
    });
    if (prog.match(/def\s*\:/) && opts && opts.data === true) {
      prog = this.parseDefinitionsArea(
        { typedExpressions, expressions, value: prog },
      );
    }

    if (opts && opts.parseCases) {
      prog = this.read({
        array: elements,
        name: "block",
        value: prog,
        typedExpressions,
        expressions,
        before: (str) =>
          str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
      });

      prog = this.read({
        array: elements,
        name: "parentheses",
        value: prog,
        typedExpressions,
        expressions,
        before: (str) =>
          str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
      });
      prog = this.parseCases({ typedExpressions, expressions, value: prog });
      // we return directly cause parseCases impact the other parsing algos
      return {
        value: prog,
        body: typedExpressions,
      };
    }
    if (opts && opts.beforeCases) {
      prog = this.parseBeforeCases(
        { typedExpressions, expressions, value: prog },
      );
    }

    prog = this.read({
      array: elements,
      value: prog,
      typedExpressions,
      expressions,
      before: (str) => str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
    });
    if (opts && opts.cjs) {
      prog = this.read({
        array: cjsElements,
        value: prog,
        typedExpressions,
        expressions,
        before: (str) =>
          str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
      });
    }

    if (opts && opts.esm) {
      prog = this.read({
        array: esmElements,
        value: prog,
        typedExpressions,
        expressions,
      });
    }

    if (opts && opts.onlyDeclarations) {
      prog = this.read(
        {
          typedExpressions,
          expressions,
          array: O3Elements,
          value: prog,
          name: "declarations",
        },
      );
      return {
        value: prog,
        body: typedExpressions,
      };
    }

    if (opts && opts.reactivity) {
      prog = this.renderReactivity({
        typedExpressions,
        expressions,
        value: prog,
      });
      if (opts.casesAreLinkables) {
        // let the developper use 'run case' feature
        prog = this.read(
          {
            array: O3Elements,
            typedExpressions,
            expressions,
            value: prog,
            name: "linkCases",
          },
        );
      }
    }

    // update blocks and parentheses

    Object.entries(typedExpressions.parentheses).forEach(([key, value]) => {
      typedExpressions.parentheses[key] = this.read({
        array: elements,
        name: "block",
        value,
        typedExpressions,
        expressions,
        before: (str) =>
          str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
      });
      if (opts && opts.cjs) {
        typedExpressions.parentheses[key] = this.read({
          array: cjsElements,
          value: typedExpressions.parentheses[key],
          typedExpressions,
          expressions,
          before: (str) =>
            str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
        });
      }

      if (opts && opts.esm) {
        typedExpressions.parentheses[key] = this.read({
          array: esmElements,
          value: typedExpressions.parentheses[key],
          typedExpressions,
          expressions,
        });
      }
      if (opts.reactivity) {
        typedExpressions.parentheses[key] = this.renderReactivity({
          typedExpressions,
          expressions,
          value: typedExpressions.parentheses[key],
        });
        if (opts.casesAreLinkables) {
          // let the developper use 'run case' feature
          typedExpressions.parentheses[key] = this.read(
            {
              typedExpressions,
              expressions,
              array: O3Elements,
              value: typedExpressions.parentheses[key],
              name: "linkCases",
            },
          );
        }
      }
    });
    Object.entries(typedExpressions.blocks).forEach(([key, value]) => {
      typedExpressions.blocks[key] = this.read(
        {
          typedExpressions,
          expressions,
          array: elements,
          value,
          name: "endLine",
          before: (str) =>
            str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
        },
      );
      if (opts && opts.cjs) {
        typedExpressions.blocks[key] = this.read(
          {
            typedExpressions,
            expressions,
            array: cjsElements,
            value: typedExpressions.blocks[key],
            before: (str) =>
              str.replace(/\}/gi, "\n}").replace(/(\{)(\w)/, "$1\n$2"),
          },
        );
      }

      if (opts && opts.esm) {
        typedExpressions.blocks[key] = this.read({
          array: esmElements,
          value: typedExpressions.blocks[key],
          typedExpressions,
          expressions,
        });
      }
      if (opts.reactivity) {
        typedExpressions.blocks[key] = this.renderReactivity({
          typedExpressions,
          expressions,
          value: typedExpressions.blocks[key],
        });
        if (opts.casesAreLinkables) {
          // let the developper use 'run case' feature
          typedExpressions.blocks[key] = this.read(
            {
              typedExpressions,
              expressions,
              array: O3Elements,
              value: typedExpressions.blocks[key],
              name: "linkCases",
            },
          );
        }
      }
    });
    Object.entries(typedExpressions).forEach(([key, value]) => {
      // @ts-ignore
      Object.entries(typedExpressions[key]).forEach(([key2, value2]) => {
        if (
          [
            "blocks",
            "parentheses",
            "setters",
          ]
            .includes(key)
        ) {
          // dont set expressions for Ogone tools
          // @ts-ignore
          expressions[key2] = value2;
        }
      });
    });
    // finally replace all keys
    prog = templateReplacer(prog, expressions);
    return {
      value: prog,
      body: typedExpressions,
    };
  }
  private renderReactivity(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }): string {
    const { typedExpressions, expressions, value } = opts;
    let result = this.read({
      array: computedExp,
      value,
      typedExpressions,
      expressions,
    });
    result = this.transformSetStatements(
      { typedExpressions, expressions, value: result },
    );
    result = this.setInvalidations(
      { typedExpressions, expressions, value: result },
    );
    return result;
  }
  private readDeclare(opts: {
    typedExpressions: TypedExpressions;
    expressions: any;
    value: string;
  }): string {
    const { typedExpressions, expressions, value } = opts;
    let newValue = value;
    let result: string = this.read({
      array: [...notParsedElements, ...elements, ...computedExp],
      value,
      typedExpressions,
      expressions,
    });
    const declarations: string[] = result.split(
      /((§§Declaration\d+§§)|(§§keywordDefault\d+§§)|(§§keywordCase\d+§§)|(§§keywordBeforeEach\d+§§))/gi,
    )
      .filter((d) => d)
      .filter((d, i, arr) =>
        d && arr[i - 1] && arr[i - 1].match(/(§§Declaration\d+§§)/i)
      );
    if (!declarations.length) return value;
    const values = declarations;
    const content = declarations.filter((d) =>
      d && !d.match(/(§§Declaration\d+§§)/i)
    );
    const all = templateReplacer(values.join(""), expressions);
    typedExpressions.protocol = `class Protocol { ${
      templateReplacer(content.join(""), expressions)
    } }`;
    const start = value.indexOf(all);
    const end = start + all.length;
    const startTokens = value.substring(0, start);
    const endTokens = value.substring(end);
    newValue = startTokens + endTokens;
    return newValue;
  }
}
