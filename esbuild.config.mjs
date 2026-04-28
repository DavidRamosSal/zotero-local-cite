import esbuild from "esbuild";
import builtinModules from "builtin-modules";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const production = process.argv.includes("production");
const watch = !production;

const copyStaticFiles = async () => {
  await Promise.all(
    ["manifest.json", "styles.css"].map(async (file) => {
      const source = path.join(process.cwd(), file);
      const target = path.join(process.cwd(), "dist", file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }),
  );
};

const buildOptions = {
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", ...builtinModules],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  minify: production,
  legalComments: "none",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "dist/main.js",
  define: {
    "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development"),
  },
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  await copyStaticFiles();
  console.log("Watching for changes");
} else {
  await esbuild.build(buildOptions);
  await copyStaticFiles();
}
