/**
 * tsc can slow down the compilation of the components
 * there is a way to avoid that
 * declare only types dependencies by inspection with regexp
 */
interface Analysis {
  children?: Analysis[];
  reg: RegExp;
  value?: string;
  start?: string;
  end?: string;
}
export const members: Analysis[] = [
  {
    reg: /\bOgone\b/,
    start: "declare namespace Ogone {",
    children: [
      {
        reg: /\bOgone.error\b/,
        value: `    export function error(
          title: string,
          description: string,
          error: Error | TypeError | SyntaxError | { message: string },
        ): void;`,
      },
      {
        reg: /\bOgone.stores\b/,
        value: "export const stores: { [k: string]: { [k: string]: any } };",
      },
      {
        reg: /\bOgone.clients\b/,
        value: `export const clients: [
          string,
          (namespace: string, dependency: string, overwrite?: boolean) => any,
        ][];`,
      },
      {
        reg: /\bOgone.render\b/,
        value: `export const render: { [k: string]: Function };`,
      },
      {
        reg: /\bOgone.contexts\b/,
        value: `export const contexts: { [k: string]: Function };`,
      },
      {
        reg: /\bOgone.components\b/,
        value: `export const components: { [k: string]: Function };`,
      },
      {
        reg: /\bOgone.classes\b/,
        value: `export const classes: { [k: string]: any };`,
      },
      {
        reg: /\bOgone.errorPanel\b/,
        value: `export const errorPanel: any;`,
      },
      {
        reg: /\bOgone.warnPanel\b/,
        value: `export const warnPanel: any;`,
      },
      {
        reg: /\bOgone.successPanel\b/,
        value: `export const successPanel: any;`,
      },
      {
        reg: /\bOgone.infosPanel\b/,
        value: `export const infosPanel: any;`,
      },
      {
        reg: /\bOgone.historyError\b/,
        value: `export const historyError: any;`,
      },
      {
        reg: /\bOgone.errors\b/,
        value: `export const errors: number;`,
      },
      {
        reg: /\bOgone.firstErrorPerf\b/,
        value: `export const firstErrorPerf: any;`,
      },
      {
        reg: /\bOgone.oscillator\b/,
        value: `export const oscillator: any;`,
      },
      {
        reg: /\bOgone.sound\b/,
        value: `export const sound: ((opts: any) => void) | null;`,
      },
      {
        reg: /\bOgone.router\b/,
        value: `export const router: RouterBrowser | null;`,
      },
      {
        reg: /\bOgone.DevTool\b/,
        value: `export const DevTool: any | undefined;`,
      },
      {
        reg: /\bOgone.ComponentCollectionManager\b/,
        value: `export const ComponentCollectionManager: any | undefined;`,
      },
    ],
    end: "}",
  },
  {
    reg: /\bOComponent\b/,
    value: "declare function OComponent(): any;",
  },
  {
    reg: /\bRouterBrowser\b/,
    start: "declare interface RouterBrowser {",
    children: [
      {
        reg: /\b(Ogone.router.react)\b/,
        value: "react: Function[];",
      },
      {
        reg: /\b(Ogone.router.actualRoute)\b/,
        value: "actualRoute: null | string;",
      },
      {
        reg: /\b(Ogone.router.go)\b/,
        value: "go: (url: string, state: any) => void;",
      },
      {
        reg: /\b(Ogone.router.openDevTool)\b/,
        value: "openDevTool: (opts: any) => void;",
      },
    ],
    end: "}",
  },
  {
    reg: /\bAsync\b/,
    start: "declare namespace Async {",
    children: [
      {
        reg: /\bAsync.resolve\b/,
        value: "export function resolve(): void;",
      },
    ],
    end: "}",
  },
  {
    reg: /\bStore\b/,
    start: "declare namespace Store {",
    children: [
      {
        reg: /\bdispatch\b/,
        value: "export function dispatch(ns: string, ctx?: any): any;",
      },
      {
        reg: /\bcommit\b/,
        value: "export function commit(ns: string, ctx?: any): any;",
      },
    ],
    end: "}",
  },
  {
    reg: /\bControllers\b/,
    value: `
    declare const Controllers: { [k: string]: Controller; };
    declare interface Controller {
      get(rte: string): Promise<any>;
      post(rte: string, data: { [k: string]: any }, op: { [k: string]: any }): Promise<any>;
      put(rte: string, data: { [k: string]: any }, op: { [k: string]: any }): Promise<any>;
      patch(rte: string, data: { [k: string]: any }, op: { [k: string]: any }): Promise<any>;
      delete(rte: string, data: { [k: string]: any }, op: { [k: string]: any }): Promise<any>;
    };
    `,
  },
  {
    reg: /\bRefs\b/,
    value: `
    declare const Refs: {
      [k: string]: HTMLElement;
    };`,
  },
  {
    reg: /\b_state\b/,
    value: `declare type _state = string | number;`,
  },
  {
    reg: /\bctx\b/,
    value: `declare type ctx = {[k: string]: any};`,
  },
  {
    reg: /\bevent\b/,
    value: `declare type event = Event;`,
  },
  {
    reg: /\b_once\b/,
    value: `declare type _once = number;`,
  },
  {
    reg: /\b____\b/,
    value:
      "declare function ____(key: string, ctx: { [k: string]: any }): void;",
  },
];
export default (text: string): string => {
  let result: string = "";
  function recursive(items: Analysis[]) {
    items.forEach((rule: Analysis) => {
      if (!rule.reg.test(text)) return;
      if (rule.value) result += rule.value;
      if (rule.start) result += rule.start;
      if (rule.children) recursive(rule.children);
      if (rule.end) result += rule.end;
    });
  }
  recursive(members);
  return result;
};
