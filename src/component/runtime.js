module.exports = function(event) {
  if (!this.item.scripts[event]) return;
  try {
    const Render = (ref, html) => {
      try {
        if (ref.length && !this.item.refs[ref]) {
          return;
        }
        const querySelector = this.item.refs[ref] || false;
        let result = html;
        if (Array.isArray(html)) {
          result = html.join('');
        }
        if (html instanceof Function) {
          result = html();
        }
        const oElementId = `o-${(querySelector || '').trim().replace(/([^a-zA-Z0-9]*)+/gi, '') || ''}-rd`;
        this.send({
          id2: oElementId,
          html: result.replace(/%%id%%/gi, `${this.id} ${oElementId}`),
          querySelector: !!querySelector ? 
            `[${this.item.uuid}][${this.id}] > ${querySelector.trim()}`:
            null,
          type: 'render',
          id: this.id,
        });
      } catch(e) {
        throw e;
      }
    };
    const Pragma = (name, attr, ...childs) => {
      try {
        let attrs = [];
        if (attr) {
          attrs = Object.entries(attr).map(([key, value]) => {
            if (key.slice(0, 2) === '$$') {
              return;
            }
            return `${key}="${value}"`
          })
        }
        const element = `<${name} %%id%% ${component.uuid} ${attrs.join(' ')}>${childs.flat().join(' ')}</${name}>`
        // direct rendering with $$ references
        if (attr) {
          const ref = Object.entries(attr).find(([key]) => key.slice(0, 2) === '$$');
          if (ref) {
            const id = ref[0].slice(2);
            Render(id, element);
            return id;
          }
        }
        return element;
      } catch(e) {
        throw e;
      }
    };
    const oc = this;
    const Watcher = function(prop, w){
      oc.watchers[prop] = w;
    };
    this.item.scripts[event].bind(this.proxy)(
      Pragma, 
      Render,
      Watcher,
      this.modules);
  } catch(e) {
    throw e;
  }
}