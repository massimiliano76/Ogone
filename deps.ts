export { existsSync } from "https://deno.land/std@v0.61.0/fs/exists.ts";
export { serve } from "https://deno.land/std@v0.61.0/http/server.ts";
export * as colors from "https://deno.land/std@0.61.0/fmt/colors.ts";
export {
  join,
  relative,
} from "https://deno.land/std@0.61.0/path/mod.ts";
export { Server } from "https://deno.land/std@v0.61.0/http/server.ts";
export {
  WebSocket,
  WebSocketServer,
} from "https://deno.land/x/websocket/mod.ts";
export { YAML } from "https://raw.githubusercontent.com/eemeli/yaml/master/src/index.js";
export * as SUI from "https://raw.githubusercontent.com/jeanlescure/short_uuid/master/mod.ts";
export {
  assertEquals,
  assertThrows,
  assertStringContains,
  assertArrayContains,
  fail,
} from "https://deno.land/std@0.61.0/testing/asserts.ts";
export { compile as sassCompiler } from "https://deno.land/x/sass/mod.ts";
import { parse } from "https://x.nest.land/denolus@0.0.4/src/parser/index.ts";
import { compile } from "https://x.nest.land/denolus@0.0.4/src/compiler/index.ts";

export function denolusCompiler(code: string) {
  return compile(parse(code));
}
export function absolute(base: string, relative: string) {
  const stack = base.split("/"),
    parts = relative.split("/");
  stack.pop();
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] == ".") {
      continue;
    }
    if (parts[i] == "..") {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join("/");
}
export async function fetchRemoteRessource(p: string): Promise<string | null> {
  const a = await fetch(p);
  if (a.status < 400) {
    const b = await a.blob();
    const c = await b.text();
    return c;
  } else {
    return null;
  }
}
