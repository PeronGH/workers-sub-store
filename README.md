# workers-sub-store

Converts proxy subscriptions between formats on Cloudflare Workers, using the parse/produce core of [Sub-Store](https://github.com/sub-store-org/Sub-Store) without its server, storage, or processors.

`scripts/build-core.mjs` bundles the `Sub-Store` submodule with esbuild into `gen/sub-store-core.mjs`, stubbing everything outside format conversion and precompiling the peggy grammars, since Workers disallows `eval`.

## Usage

```sh
git clone --recurse-submodules https://github.com/PeronGH/workers-sub-store.git
pnpm install
pnpm dev      # local server
pnpm deploy   # deploy to Cloudflare
```

Wrangler rebuilds the core before each run. Opening `/` without parameters shows a form that builds the link below.

```
GET /?url=<subscription>&target=<platform>
```

| Parameter | Description |
| --- | --- |
| `url` | Subscription URL. Repeat it, or separate URLs with newlines, to merge several. |
| `target` | Output format: `ClashMeta`, `Clash`, `Stash`, `Surge`, `SurgeMac`, `Surfboard`, `Loon`, `QX`, `Shadowrocket`, `Egern`, `sing-box`, `URI`, `V2Ray`, `JSON` |
| `ua` | User-Agent for fetching subscriptions. Default: `clash.meta/v1.19.23` |

Input can be a Clash/mihomo YAML, a base64 or plain list of URIs, Surge/Loon/QX proxy lines or full configs, SSD, or an HTML-wrapped subscription.

## Example

```sh
curl 'https://sub-store.<account>.workers.dev/?url=https%3A%2F%2Fexample.com%2Fsub&target=sing-box'
```

## License

The deployed Worker bundles Sub-Store, which is licensed under AGPL-3.0.
