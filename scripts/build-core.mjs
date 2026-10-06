// Bundles Sub-Store's parse/produce core into a single ESM module that runs on workerd.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'Sub-Store/backend');
const src = path.join(backend, 'src');
const outfile = path.join(root, 'gen/sub-store-core.mjs');
const peggy = createRequire(path.join(backend, 'package.json'))('peggy');

const shims = {
    'core/app': path.join(root, 'scripts/shims/app.js'),
    'utils/rs': path.join(root, 'scripts/shims/rs.js'),
};

// Reachable only from processors, scripts and storage, none of which parse/produce use.
const stubbed = new Set([
    'core/proxy-utils/processors',
    'restful/sync',
    'runtime/fs',
    'utils/age',
    'utils/database',
    'utils/dns',
    'utils/download',
    'utils/geo',
    'utils/gist',
]);

const subStoreCore = {
    name: 'sub-store-core',
    setup(b) {
        b.onResolve({ filter: /^(@\/|\.\/processors$)/ }, (args) => {
            const rel = args.path.startsWith('@/')
                ? args.path.slice(2)
                : path.relative(src, path.join(args.resolveDir, args.path));
            if (shims[rel]) return { path: shims[rel] };
            if (stubbed.has(rel)) return { path: rel, namespace: 'stub' };
        });
        // CommonJS so that named imports resolve to undefined instead of failing the build.
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'module.exports = {};', loader: 'js' }));

        // peggy.generate() compiles with eval, which workerd forbids, so compile grammars at build time.
        b.onLoad({ filter: /parsers[\\/]peggy[\\/](surge|loon|qx)\.js$/ }, async (args) => {
            const code = await readFile(args.path, 'utf8');
            const grammar = String.raw({ raw: [code.match(/String\.raw`([\s\S]*?)`;/)[1]] });
            const parser = peggy.generate(grammar, { output: 'source', format: 'commonjs' });
            const contents = code.replace(
                "import peggy from 'peggy';",
                `const __peggy = { exports: {} };
(function (module, exports) {\n${parser}\n})(__peggy, __peggy.exports);
const peggy = { generate: () => __peggy.exports };`,
            );
            return { contents, loader: 'js' };
        });
    },
};

await build({
    absWorkingDir: backend,
    entryPoints: [path.join(root, 'scripts/core-entry.js')],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['workerd', 'worker', 'browser'],
    logLevel: 'error',
    plugins: [subStoreCore],
});

execFileSync(
    process.execPath,
    ['--disallow-code-generation-from-strings', path.join(root, 'scripts/check-core.mjs'), outfile],
    { stdio: 'inherit' },
);
