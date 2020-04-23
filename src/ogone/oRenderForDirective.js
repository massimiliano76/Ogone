const uuid = require('uuid-node');

module.exports = function oRenderForDirective(directiveValue) {
  if (directiveValue.indexOf('as') === -1) {
    const OgoneForDirectiveSyntaxException = new Error(`[Ogone] Syntax Error: ${directiveValue}, no (as) found \n\tPlease follow this o-for syntax. arrayName as (item [, i]) `);
    throw OgoneForDirectiveSyntaxException;
  }
  const oForRegExp = /([\S]*)+\sas\s\(([^,\s\n\t]*)+,{0,1}\s{0,1}(([^,\s\n\t]*)+){0,1}\)/gi.exec(directiveValue);
  if (!oForRegExp) {
    const OgoneForDirectiveSyntaxException = new Error(`[Ogone] Syntax Error: ${directiveValue} \n\tPlease follow this o-for syntax. arrayName as (item [, i]) `);
    throw OgoneForDirectiveSyntaxException;
  }
  let [context, arrayName, item, index] = oForRegExp;
  arrayName = directiveValue.split('as')[0].trim();
  return {
    index: index ? index : `i${uuid.generateUUID().split('-')[0]}`,
    item,
    array: arrayName,
    evaluated: `${arrayName}[${index}]`,
    content: directiveValue,
    limit: `l${uuid.generateUUID().split('-')[0]}`,
    exitVariable: `ex${uuid.generateUUID().split('-')[0]}`,
  };
}