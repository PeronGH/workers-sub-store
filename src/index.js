import { parse, produce } from '../gen/sub-store-core.mjs';

// Sub-Store's default; many providers pick the response format from the User-Agent.
const DEFAULT_USER_AGENT = 'clash.meta/v1.19.23';
const JSON_TARGETS = new Set(['json', 'JSON', 'singbox', 'sing-box']);

const usage = 'Usage: /?url=<subscription>&target=<platform>[&url=...][&ua=<user-agent>]';

export default {
    async fetch(request) {
        const { searchParams } = new URL(request.url);
        const urls = searchParams.getAll('url');
        const target = searchParams.get('target');
        if (urls.length === 0 || !target) {
            return new Response(usage, { status: 400 });
        }

        const userAgent = searchParams.get('ua') || DEFAULT_USER_AGENT;
        const responses = await Promise.all(
            urls.map((url) => fetch(url, { headers: { 'User-Agent': userAgent } })),
        );
        const failed = responses.find((res) => !res.ok);
        if (failed) {
            return new Response(`Upstream ${failed.url} responded ${failed.status}`, { status: 502 });
        }
        const raws = await Promise.all(responses.map((res) => res.text()));

        let output;
        try {
            // Parse each subscription separately: format detection works per document.
            output = produce(raws.flatMap(parse), target);
        } catch (error) {
            return new Response(String(error), { status: 400 });
        }

        const contentType = JSON_TARGETS.has(target) ? 'application/json' : 'text/plain';
        return new Response(output, {
            headers: { 'Content-Type': `${contentType}; charset=utf-8` },
        });
    },
};
