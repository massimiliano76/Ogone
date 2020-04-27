const Ogone = require('.');

module.exports = function oRenderContext(keyComponent) {
  const component = Ogone.components.get(keyComponent);
  Object.entries(component.for).forEach(([querySelector, directive]) => {
    const { script, } = directive;
    const contextScript = `
    Ogone.contexts['${component.uuid}-${querySelector}'] = function(opts) {
        const {
          getLength: GET_LENGTH,
          getText: GET_TEXT,
          position: POSITION,
        } = opts;
        ${
          component.data instanceof Object ? 
            Object.keys(component.data).map((prop) => `const ${prop} = this.${prop};`).join('\n')
          : ''
        }
        ${script.value || ''}
        if (GET_TEXT) {
          return eval(GET_TEXT);
        }
      };
    `;
    Ogone.contexts.push(contextScript);
  });
};
