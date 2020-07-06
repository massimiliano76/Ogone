import { existsSync } from "../../../../utils/exists.ts";
import jsThis from "../../../../lib/js-this/switch.ts";
import { Bundle } from "../../../../.d.ts";
import { join, relative } from "../../../../deps.ts";

function absolute(base: string, relative: string) {
  const stack = base.split("/"),
      parts = relative.split("/");
  stack.pop();
  for (let i = 0; i < parts.length; i++) {
      if (parts[i] == ".")
          continue;
      if (parts[i] == "..")
          stack.pop();
      else
          stack.push(parts[i]);
  }
  return stack.join("/");
}

async function fetchComponent(p: string) {
  console.warn('[Ogone] Downloading',p);
  const a = await fetch(p);
  if (a.status < 400) {
    const b = await a.blob();
    const c = await b.text();
    return c;
  } else {
    return null;
  }
}
async function startRecursiveInspectionOfComponent(
  textFile: string,
  p: string,
  bundle: Bundle,
  opts: any = {
    remote: false,
    baseUrl: '',
    current: '',
  }
) {
  const splitTextUseFirstPart = textFile.split(/\<([a-zA-Z0-9]*)+/i)[0];
  const tokens = jsThis(splitTextUseFirstPart, { onlyDeclarations: true });
  bundle.files.push(p);
  if (tokens.body && tokens.body.use) {
    for await (let c of Object.values(tokens.body.use)) {
      const { path, type }: any = c;
      if (path === p) return;

      if (type === "remote") {
        const file = await fetchComponent(path);
        if (file) {
          await startRecursiveInspectionOfComponent(file, path, bundle, {
            remote: true,
            base: path.match(/(http|https|ws|wss|ftp|tcp|fttp)(\:\/{2}[^\/]+)/gi)[0],
            current: path,
          });
        } else {
          throw new Error(`[Ogone] unreachable remote component.\t\t\ninput: ${path}`);
        }
      } else if ( type === "absolute" && existsSync(path)) {
        // absolute  and local
        const file = Deno.readTextFileSync(path);
        startRecursiveInspectionOfComponent(file, path, bundle);
      } else if (opts.remote && type === "relative" && opts.base) {
        // relative and remote
        const newPath = `${opts.current.split('://')[0]}://${absolute(opts.current.split('://')[1], path)}`;
        const file = await fetchComponent(newPath);
        if (file) {
          await startRecursiveInspectionOfComponent(file, newPath, bundle, {
            ...opts,
            current: newPath,
          });
        } else {
          throw new Error(`[Ogone] unreachable remote component.\t\t\ninput: ${newPath}`);
        }
      } else if (!opts.remote && type === "relative") {
        const newPath = join(p, path);
        if (existsSync(newPath)) {
          const file = Deno.readTextFileSync(newPath);
          startRecursiveInspectionOfComponent(file, newPath, bundle);
        }
      } else {
        const ComponentNotFoundException = new Error(
          `[Ogone] component not found. input: ${path}`,
        );
        throw ComponentNotFoundException;
      }
    }
  }
}
export default async function oInspect(entrypoint: string, bundle: Bundle) {
  if (existsSync(entrypoint)) {
    const rootComponentFile = Deno.readTextFileSync(entrypoint);
    await startRecursiveInspectionOfComponent(
      rootComponentFile,
      entrypoint,
      bundle,
    );
  } else {
    const OgoneSrcFileNotFoundException = new Error(
      `[Ogone] entrypoint file doesn't exist \n\t${entrypoint}`,
    );
    throw OgoneSrcFileNotFoundException;
  }
}
