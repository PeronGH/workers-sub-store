// Run with --disallow-code-generation-from-strings to mirror workerd's eval restriction.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { parse, produce } = await import(pathToFileURL(process.argv[2]).href);

const raw = [
    'ss://YWVzLTEyOC1nY206cGFzcw==@1.1.1.1:8388#uri',
    'surge = ss, 2.2.2.2, 8388, encrypt-method=aes-128-gcm, password=pass',
    'loon = Shadowsocks, 3.3.3.3, 8388, aes-128-gcm, "pass"',
    'shadowsocks=4.4.4.4:8388, method=aes-128-gcm, password=pass, tag=qx',
].join('\n');

const proxies = parse(raw);
assert.deepEqual(
    proxies.map((p) => p.name),
    ['uri', 'surge', 'loon', 'qx'],
);

for (const target of ['ClashMeta', 'Surge', 'Loon', 'QX', 'sing-box', 'URI']) {
    const output = produce(proxies, target);
    for (const server of ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4']) {
        assert.ok(output.includes(server), `${target} output is missing ${server}`);
    }
}
