import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const declarationsRoot = fileURLToPath(
  new URL("../lib/typescript/module/", import.meta.url),
);
const relativeSpecifier = /(\bfrom\s+["'])(\.\.?\/[^"']+)(["'])/g;

async function rewriteDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await rewriteDirectory(filePath);
        return;
      }

      if (!entry.name.endsWith(".d.ts")) {
        return;
      }

      const source = await readFile(filePath, "utf8");
      const rewritten = source.replace(
        relativeSpecifier,
        (match, prefix, specifier, quote) => {
          if (extname(specifier)) {
            return match;
          }

          const target = join(dirname(filePath), specifier);

          if (existsSync(`${target}.d.ts`)) {
            return `${prefix}${specifier}.js${quote}`;
          }

          if (existsSync(join(target, "index.d.ts"))) {
            return `${prefix}${specifier}/index.js${quote}`;
          }

          return match;
        },
      );

      if (rewritten !== source) {
        await writeFile(filePath, rewritten);
      }
    }),
  );
}

await rewriteDirectory(declarationsRoot);
