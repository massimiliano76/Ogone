import { Bundle } from "../../.d.ts";
import { XMLNodeDescription } from "../../.d.ts";
import { Utils } from "../utils/index.ts";

export default class ContextBuilder extends Utils {
  read(bundle: Bundle, keyComponent: string) {
    const component = bundle.components.get(keyComponent);
    if (component) {
      Object.entries(component.for).forEach(([nId, flag]) => {
        // @ts-ignore
        const { script } = flag;
        const { modules } = component;
        const { node, ctx, getLength, array } = script;
        let contextIf = null;
        if (node.attributes && node.attributes["--if"]) {
          let nxt = node.nextElementSibling;
          node.hasFlag = true;
          node.ifelseBlock = {
            main: node.attributes["--if"],
            ifFlag: {
              [node.id]: node.attributes["--if"],
            },
            elseIf: {},
            elseFlag: {},
          };
          while (
            nxt && nxt.attributes &&
            (nxt.attributes["--else-if"] || nxt.attributes["--else"])
          ) {
            nxt.ifelseBlock = node.ifelseBlock;
            if (nxt.attributes["--else-if"]) {
              node.ifelseBlock.elseIf[nxt.id] = nxt.attributes["--else-if"];
            } else {
              node.ifelseBlock.elseFlag[nxt.id] = nxt.attributes["--else"];
            }

            const elseDir = !!nxt.attributes["--else"];
            nxt = nxt.nextElementSibling;
            if (
              elseDir && nxt && nxt.attributes &&
              (!!nxt.attributes["--else"] || !!nxt.attributes["--else-if"])
            ) {
              this.error(
                "else flag has to be the last in if-else-if blocks, no duplicate of --else are allowed.",
              );
            }
          }
        }
        if (node.ifelseBlock && node.attributes && !node.attributes["--for"]) {
          node.hasFlag = true;
          const { ifFlag, elseFlag, elseIf, main } = node.ifelseBlock;
          const isElse = elseFlag[node.id];
          const isElseIf = elseIf[node.id];
          const isMain = ifFlag[node.id];
          const allElseIf = Object.values(elseIf);
          if (!!isMain) {
            contextIf = `
              if (GET_LENGTH && !(${main})) {
                return 0;
              }
            `;
          } else if (!!isElseIf) {
            contextIf = `
              if (GET_LENGTH && (${main})) {
                return 0;
              } else if (GET_LENGTH && !(${isElseIf})) {
                return 0;
              }
            `;
          } else if (!!isElse) {
            contextIf = `
              if (GET_LENGTH && (${main})) {
                return 0;
              ${
              allElseIf.map((key) => {
                return `
              } else if (GET_LENGTH && ${key}) {
                return 0;`;
              }).join("\n")
            }
              }
            `;
          }
        }
        function renderConditions(item: XMLNodeDescription) {
          if (!!item.ifelseBlock && item.id) {
            item.hasFlag = true;
            const { ifFlag, elseFlag, elseIf, main } = item.ifelseBlock;
            const isElse = elseFlag[item.id];
            const isElseIf = elseIf[item.id];
            const isMain = ifFlag[item.id];
            const allElseIf = Object.values(elseIf);
            if (!!isMain) {
              return `(${main})`;
            } else if (!!isElseIf) {
              return `!(${main}) && (${isElseIf})`;
            } else if (!!isElse) {
              return `!(${main}) && !(${allElseIf.join(" && ")})`;
            }
          }
          return "";
        }
        const contextScript =
          node.hasFlag || !node.tagName && node.nodeType === 1
            ? `
        Ogone.contexts['{{ context.id }}'] = function(opts) {
            const GET_TEXT = opts.getText;
            const GET_LENGTH = opts.getLength;
            const POSITION = opts.position;
            {{ data }}
            {{ modules }}
            {{ context.array }}
            {{ value }}
            {{ context.if }}
            {{ context.getLength }}
            if (GET_TEXT) {
              try {
                return eval('('+GET_TEXT+')');
              } catch(err) {
                Ogone.error('Error in component:\\n\\t {{component.file}} '+\`$\{GET_TEXT}\`, err.message ,err);
                throw err;
              }
            }
            return { {{ context.result }} };
          };
        `
            : `Ogone.contexts['{{ context.id }}'] = Ogone.contexts['{{ context.parentId }}'];`;
        bundle.contexts.push(
          this.template(contextScript, {
            component,
            data: component.data instanceof Object
              ? Object.keys(component.data).map((prop) =>
                `const ${prop} = this.${prop};`
              ).join("\n")
              : "",
            value: script.value || "",
            context: {
              id: `${component.uuid}-${nId}`,
              if: contextIf ? contextIf : "",
              parentId: node.parentNode
                ? `${component.uuid}-${node.parentNode.id}`
                : "",
              result: [...Object.keys(ctx), ...Object.keys(component.data)],
              array: array ? `const _____a_ = ${array} || [];` : "",
              getLength: getLength
                ? getLength({
                  filter: renderConditions(node),
                })
                : "",
            },
            modules: modules ? modules.map((md) => md[0]).join(";\n") : "",
          }).replace(/\n/gi, "")
            .replace(/\s+/gi, " "),
        );
      });
    }
  }
}
