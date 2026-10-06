import { parse, produce, yaml } from '../gen/sub-store-core.mjs';

// Sub-Store's default; many providers pick the response format from the User-Agent.
const DEFAULT_USER_AGENT = 'clash.meta/v1.19.23';
const JSON_TARGETS = new Set(['json', 'JSON', 'singbox', 'sing-box']);
const CLASH_TARGETS = new Set([
    'Clash',
    'ClashMeta',
    'clashmeta',
    'Clash.Meta',
    'clash.meta',
    'meta',
    'Mihomo',
    'mihomo',
    'Stash',
    'stash',
]);

const usage =
    'Usage: /sub?url=<subscription>&target=<platform>[&url=...][&ua=<user-agent>][&template=<clash config url>]';

// Static assets are served without invoking the Worker; it only sees requests no asset matched.
export default {
    async fetch(request) {
        const { pathname, searchParams } = new URL(request.url);
        if (pathname !== '/sub') {
            return new Response('Not Found', { status: 404 });
        }
        // The form submits one textarea value with a URL per line.
        const urls = searchParams.getAll('url').flatMap((value) => value.split(/\s+/).filter(Boolean));
        const target = searchParams.get('target');
        if (urls.length === 0 || !target) {
            return new Response(usage, { status: 400 });
        }
        const template = searchParams.get('template');
        if (template && !CLASH_TARGETS.has(target)) {
            return new Response('template requires a Clash, mihomo or Stash target', { status: 400 });
        }

        const userAgent = searchParams.get('ua') || DEFAULT_USER_AGENT;
        const sources = template ? [...urls, template] : urls;
        const responses = await Promise.all(
            sources.map((url) => fetch(url, { headers: { 'User-Agent': userAgent } })),
        );
        const failed = responses.find((res) => !res.ok);
        if (failed) {
            return new Response(`Upstream ${failed.url} responded ${failed.status}`, { status: 502 });
        }
        const texts = await Promise.all(responses.map((res) => res.text()));
        const raws = texts.slice(0, urls.length);

        let output;
        try {
            // Parse each subscription separately: format detection works per document.
            output = produce(raws.flatMap(parse), target);
            if (template) {
                // Groups pick up proxies through the client's `include-all` and `filter` options.
                const config = yaml.safeLoad(texts[urls.length]);
                config.proxies = yaml.safeLoad(output).proxies ?? [];
                output = yaml.safeDump(config);
            }
        } catch (error) {
            return new Response(String(error), { status: 400 });
        }

        const contentType = JSON_TARGETS.has(target) ? 'application/json' : 'text/plain';
        return new Response(output, {
            headers: { 'Content-Type': `${contentType}; charset=utf-8` },
        });
    },
};
