import components from "./component.ts";
import ogone from "./ogone.ts";
import router from "./router.ts";
import oscillator from "./oscillator.ts";
import websocket from "./websocket.ts";

export const browserBuild = (isProduction: boolean): string => {
  if (isProduction) {
    return [
      components,
      ogone,
      router,
    ].join("\n")
  }
  return [
    components,
    ogone,
    router,
    oscillator,
    websocket,
  ].join("\n")
};

export const template: string = `
<html>
  <head>
      %%head%%
  </head>
  <body>
      %%dom%%
  </body>
</html>
`;
