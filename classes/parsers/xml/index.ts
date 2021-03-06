import XMLPragma from "./set-nodes-pragma.ts";
import templateReplacer from "../../../utils/template-recursive.ts";
import {
  XMLNodeDescription,
  DOMParserIterator,
  DOMParserExp,
  DOMParserExpressions,
} from "../../../.d.ts";

const openComment = "<!--";
const closeComment = "-->";

/**
 * @class
 * @name XMLParser
 * @description
 * parser for xml
 * @example
 * ```ts
 * XMLParser.parse('<div></div>'): XMLNodeDescription
 * ```
 */
export default class XMLParser extends XMLPragma {
  private getUniquekey(id = "", iterator: DOMParserIterator): string {
    iterator.value++;
    // critical all regexp are based on this line
    return `§§${iterator.value}${id}§§`;
  }
  private getNodeUniquekey(id = "", iterator: DOMParserIterator): string {
    iterator.node++;
    // critical all regexp are based on this line
    return `§§${iterator.node}${id}§§`;
  }
  private getTextUniquekey(id = "", iterator: DOMParserIterator): string {
    iterator.text++;
    // critical all regexp are based on this line
    return `§§${iterator.text}${id}§§`;
  }
  private setInnerOuterHTML(
    rootnode: XMLNodeDescription,
    expressions: DOMParserExpressions,
  ): void {
    const { nodeList } = rootnode;
    nodeList.forEach((node: XMLNodeDescription) => {
      node.getOuterHTML = () => {
        if (node.nodeType === 1) {
          let result = this.template(
            `<{{tagname}} {{attrs}}>{{outers}}</{{tagname}}>`,
            {
              outers: node.childNodes.map((c) => {
                if (c.getOuterHTML) {
                  return c.getOuterHTML();
                } else {
                  return "";
                }
              }).join(""),
              tagname: node.tagName,
              attrs: node.rawAttrs,
            },
          );
          return result;
        }
        return node.rawText || "";
      };
      node.getInnerHTML = () => {
        if (node.nodeType === 1) {
          let result = this.template("{{outers}}", {
            outers: node.childNodes.map((c) => {
              if (c.getOuterHTML) {
                return c.getOuterHTML();
              } else {
                return "";
              }
            }).join(""),
          });
          return result;
        }
        return node.rawText || "";
      };
    });
  }
  private setDNA(
    rootnode: XMLNodeDescription,
    node: XMLNodeDescription,
    expressions: DOMParserExpressions,
  ): void {
    if (rootnode !== node) {
      rootnode.nodeList.push(node);
    }
    if (!node.dna) {
      node.dna = "";
    }
    if (node.tagName) {
      node.dna += node.tagName;
      rootnode.dna += node.tagName;
      if (node.parentNode) node.parentNode.dna += node.tagName;
    }
    if (node.rawAttrs) {
      node.dna += node.rawAttrs;
      rootnode.dna += node.rawAttrs;
      if (node.parentNode) node.parentNode.dna += node.rawAttrs;
    }
    if (node.rawText) {
      node.dna += node.rawText;
      rootnode.dna += node.rawText;
      if (node.parentNode) node.parentNode.dna += node.rawText;
    }
    node.dna = templateReplacer(
      node.dna,
      (expressions as unknown) as { [key: string]: string },
      (key) => expressions[key].expression,
    );
    if (node.childNodes && node.childNodes.length) {
      node.childNodes.forEach((child, i, arr) => {
        // recursive for childNodes
        this.setDNA(rootnode, child, expressions);
      });
    }
  }
  private setElementSiblings(node: XMLNodeDescription) {
    if (node.childNodes && node.childNodes.length) {
      node.childNodes.forEach((child, i, arr) => {
        // define here sibblings elements
        if (arr[i - 1]) {
          child.previousElementSibling = arr[i - 1];
        } else {
          child.previousElementSibling = null;
        }
        if (arr[i + 1]) {
          child.nextElementSibling = arr[i + 1];
        } else {
          child.nextElementSibling = null;
        }
        // recursive for childNodes
        this.setElementSiblings(child);
      });
    }
  }
  private getRootnode(
    html: string,
    expressions: any,
  ): XMLNodeDescription | null {
    const keysOfExp = Object.keys(expressions);
    const key = keysOfExp.find((key) => html.indexOf(key) > -1);
    if (key) {
      let result: XMLNodeDescription = expressions[key];
      result.type = "root";
      delete result.id;
      return result;
    } else {
      return null;
    }
  }
  private parseNodes(html: string, expressions: DOMParserExpressions): string {
    let result = html;
    Object.entries(expressions)
      .filter(([key, value]) => value.type === "node")
      .forEach(([key, value]) => {
        const { expression, rawAttrs } = value;
        // we need to pad for the regexp
        // critical modifications here
        let rawAttrsPadded = `${rawAttrs} `;
        // get rawAttrs
        const attrRE = /([^§\s]*)+(§{2}\d*attr§§)/gi;
        const attrbooleanRE = /(?<!(§{2}))(([^§\s]*)+)\s/gi;
        const matches = rawAttrsPadded.match(attrRE);
        const matchesBoolean = rawAttrsPadded.match(attrbooleanRE);
        matches?.forEach((attr) => {
          const attrIDRE = /([^§\s]*)+(§{2}\d*attr§§)/;
          const m = attr.match(attrIDRE);
          if (m) {
            let [input, attributeName, id] = m;
            const { value } = expressions[id];
            // @ts-ignore
            expressions[key].attributes[attributeName] = value;
          }
        });
        matchesBoolean?.filter((attr) =>
          // @ts-ignore
          !expressions[key].attributes[attr.trim()] && attr.trim().length
        )
          .forEach((attr) => {
            // @ts-ignore
            expressions[key].attributes[attr.trim()] = true;
          });
      });

    const keysOfExp = Object.keys(expressions);
    // start parsing Nodes by reversed array
    Object.entries(expressions)
      .reverse()
      .filter(([key, value]) => value.type === "node")
      .forEach(([key, node]) => {
        const opening = node.key;
        const { closingTag } = node;
        // @ts-ignore
        const open = result.split(opening);
        open.filter((content: string) =>
          closingTag && content.indexOf(closingTag) > -1
        )
          .forEach((content: string) => {
            // @ts-ignore
            let innerHTML = content.split(closingTag)[0];
            const outerContent = `${opening}${innerHTML}${closingTag}`;
            // get Textnodes
            keysOfExp
              .filter((k) =>
                innerHTML.indexOf(k) > -1 &&
                expressions[k]
              )
              .sort((a, b) => innerHTML.indexOf(a) - innerHTML.indexOf(b))
              .forEach((k) => {
                expressions[key].childNodes.push(expressions[k]);
                // @ts-ignore
                expressions[k].parentNode = expressions[key];
              });
            // get attrs
            keysOfExp
              .filter((k) =>
                node.rawAttrs.indexOf(k) > -1 &&
                // @ts-ignore
                expressions[k].type === "attr"
              )
              .forEach((k) => {
                node.rawAttrs = node.rawAttrs.replace(
                  k,
                  expressions[k].expression,
                );
              });
            // @ts-ignore
            result = result.replace(outerContent, opening);
            delete expressions[key].closingTag;
            delete expressions[key].key;
            delete expressions[key].autoclosing;
            delete expressions[key].closing;
            delete expressions[key].expression;
          });
      });
    return result;
  }
  private parseTextNodes(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    const regexp = /(\<)§§\d*node§§(\>)/;
    const textnodes = result.split(regexp);
    textnodes
      .filter((content) => content.trim().length)
      .forEach((content) => {
        const key = this.getTextUniquekey("text", iterator);
        expression[key] = {
          type: "text",
          value: content,
          expression: content,
          id: iterator.text,
          nodeType: 3,
          rawAttrs: "",
          rawText: "",
          childNodes: [],
          parentNode: null,
          pragma: null,
          tagName: undefined,
          attributes: {},
          flags: null,
          dependencies: [],
        };
        result = result.replace(`>${content}<`, `>${key}<`);
      });
    return result;
  }
  private preserveNodes(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    const regexp = /<(\/){0,1}([a-zA-Z][^>\s]*)([^\>]*)+(\/){0,1}>/gi;
    const matches = result.match(regexp);
    matches?.forEach((node) => {
      const regexpID = /<(\/){0,1}([a-zA-Z][^>\s\/]*)([^\>\/]*)+(\/){0,1}>/;
      const id = node.match(regexpID);
      if (id) {
        const [input, slash, tagName, attrs, closingSlash] = id;
        const key = `<${this.getNodeUniquekey("node", iterator)}>`;
        if (!!slash) {
          // get the openning tag by tagname, id -1 and closingTag === null
          // @ts-ignore
          const tag = Object.values(expression)
            .reverse()
            // @ts-ignore
            .find((n: DOMParserExp) =>
              n.type === "node" &&
              (n.tagName &&
                n.tagName.trim() === tagName.trim()) &&
              (n.id &&
                n.id < iterator.node) &&
              n.closingTag === null &&
              !n.closing &&
              !n.autoclosing
            );
          if (tag && expression[tag.key || ""]) {
            // set the key of the closing tag
            // @ts-ignore
            expression[tag.key].closingTag = key;
          }
        } else {
          // if it's not a closing tag register it
          expression[key] = {
            key,
            tagName,
            id: iterator.node,
            rawAttrs: attrs,
            attributes: {},
            closing: !!slash,
            autoclosing: !!closingSlash,
            type: "node",
            nodeType: 1,
            closingTag: null,
            expression: input,
            childNodes: [],
            rawText: "",
            parentNode: null,
            pragma: null,
            flags: null,
            dependencies: [],
          };
        }
        result = result.replace(input, key);
      }
    });
    return result;
  }
  private preserveTemplates(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    const templates = ["${", "}"];
    const [beginTemplate, traillingTemplate] = templates;
    result.split(/[^\\](\$\{)/)
      .filter((content, id, arr) =>
        content.indexOf("}") > -1 && arr[id - 1] === beginTemplate
      )
      .forEach((content) => {
        let str = content.split(/(?<!\\)(\})/gi)[0];
        const allTemplate = `${beginTemplate}${str}${traillingTemplate}`;
        const key = this.getUniquekey("templ", iterator);
        expression[key] = {
          expression: allTemplate,
          value: str,
          type: "template",
          rawText: "",
          rawAttrs: "",
          tagName: null,
          childNodes: [],
          pragma: null,
          parentNode: null,
          id: null,
          nodeType: 1,
          attributes: {},
          flags: null,
          dependencies: [],
        };
        result = result.replace(allTemplate, key);
      });
    return result;
  }
  private preserveStrings(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    // LIT
    result.split(/((?<!\\)`)/)
      .filter((content) => content !== "`")
      .forEach((content) => {
        let str = content.split(/((?<!\\)`)/);
        str.forEach((contentOfStr) => {
          const allLit = `\`${contentOfStr}\``;
          if (result.indexOf(allLit) < 0) return;
          const key = this.getUniquekey("str", iterator);
          expression[key] = {
            expression: allLit,
            value: contentOfStr,
            type: "string",
            rawAttrs: "",
            rawText: "",
            childNodes: [],
            parentNode: null,
            pragma: null,
            id: null,
            tagName: undefined,
            nodeType: 0,
            attributes: {},
            dependencies: [],
            flags: null,
          };
          result = result.replace(allLit, key);
        });
      });
    return result;
  }
  private preserveStringsAttrs(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    const regEmptyStr = /\=\"\"/gi;
    const quotes = ['="', '"'];
    const [beginQuote, closinQuote] = quotes;
    const matchesEmpty = result.match(regEmptyStr);
    matchesEmpty?.forEach((match) => {
      const key = this.getUniquekey("attr", iterator);
      result = result.replace(match, key);
      expression[key] = {
        expression: match,
        value: match,
        type: "attr",
        rawAttrs: "",
        rawText: "",
        childNodes: [],
        parentNode: null,
        pragma: null,
        id: null,
        nodeType: 0,
        tagName: undefined,
        attributes: {},
        dependencies: [],
        flags: null,
      };
    });
    result.split(beginQuote)
      .filter((content) => /[^\\](")/.test(content))
      .forEach((content) => {
        let str = content.split(/(?<!\\)(")/gi)[0];
        const allstring = `${beginQuote}${str}${closinQuote}`;
        const key = this.getUniquekey("attr", iterator);
        expression[key] = {
          expression: allstring,
          value: str,
          type: "attr",
          rawAttrs: "",
          rawText: "",
          childNodes: [],
          parentNode: null,
          pragma: null,
          id: null,
          tagName: undefined,
          nodeType: 0,
          attributes: {},
          dependencies: [],
          flags: null,
        };
        result = result.replace(allstring, key);
      });
    return result;
  }
  private preserveComments(
    html: string,
    expression: DOMParserExpressions,
    iterator: DOMParserIterator,
  ): string {
    let result = html;
    result.split(openComment)
      .filter((open) => open.indexOf(closeComment) > -1)
      .forEach((open) => {
        let comment = open.split(closeComment)[0];
        let key = this.getUniquekey("com", iterator);
        const allComment = `${openComment}${comment}${closeComment}`;
        result = result.replace(allComment, "");
        expression[key] = {
          expression: allComment,
          value: comment,
          nodeType: 8,
          type: "comment",
          rawAttrs: "",
          rawText: "",
          childNodes: [],
          parentNode: null,
          pragma: null,
          id: null,
          tagName: undefined,
          attributes: {},
          dependencies: [],
          flags: null,
        };
      });
    return result;
  }
  private cleanNodes(expressions: DOMParserExpressions): void {
    for (let key of Object.keys(expressions)) {
      delete expressions[key].type;
    }
    const nodes = Object.values(expressions);
    for (let node of nodes) {
      if (node.nodeType === 3) {
        const { value } = node;
        let rawText = value;
        rawText = templateReplacer(
          rawText,
          (expressions as unknown) as { [key: string]: string },
          (key) => expressions[key].expression,
        );
        node.rawText = rawText;
      }
    }
  }

  public parse(html: string): XMLNodeDescription | null {
    let expressions: DOMParserExpressions = {};
    let iterator: DOMParserIterator = {
      value: 0,
      node: 0,
      text: 0,
    };
    let str = this.template(`<template>{{html}}</template>`, {
      html,
    });
    // preserve comments
    str = this.preserveComments(str, expressions, iterator);
    // preserve strings of attrs and strings
    str = this.preserveStringsAttrs(str, expressions, iterator);
    str = this.preserveStrings(str, expressions, iterator);
    // preserve templates ${}
    str = this.preserveTemplates(str, expressions, iterator);
    // preserve nodes
    str = this.preserveNodes(str, expressions, iterator);
    // parse text nodes
    str = this.parseTextNodes(str, expressions, iterator);
    // parse nodes
    str = this.parseNodes(str, expressions);

    const rootNode = this.getRootnode(str, expressions);
    if (rootNode) {
      // get rootNode
      let result: XMLNodeDescription = rootNode;
      result.id = "t";
      result.nodeList = [];
      // delete last useless props and set rawtext to textnodes
      this.cleanNodes(expressions);
      // set to all nodes the jsx pragma
      this.setNodesPragma(expressions);
      // set next/previous element sibling
      this.setElementSiblings(result);
      // get DNA of node
      // this will register any changes in the template
      this.setDNA(result, result, expressions);
      result.dna = templateReplacer(
        result.dna,
        (expressions as unknown) as { [key: string]: string },
        (key) => expressions[key].expression,
      );
      this.setInnerOuterHTML(result, expressions);
      // critical this will say to o3 that's the rootNode
      result.tagName = null;
      return result;
    } else {
      return null;
    }
  }
}
