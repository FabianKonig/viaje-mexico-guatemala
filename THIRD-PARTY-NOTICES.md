# Hinweise zu Bestandteilen Dritter

<!-- Automatisch erzeugt mit `npm run notices`. Nicht von Hand bearbeiten. -->

Für die Inhalte, den eigenen Code und die Gestaltung dieser Seite gilt: **Alle Rechte vorbehalten**
(siehe [LICENSE](LICENSE)). Die folgenden Bestandteile Dritter stehen unter ihren eigenen Lizenzen.

## 1. Mit der Seite ausgelieferte Bestandteile

| Bestandteil | Urheber | Lizenz | Lizenztext |
| --- | --- | --- | --- |
| Schrift **Fraunces** (WOFF2, Achse wght) | The Fraunces Project Authors | SIL Open Font License 1.1 | [public/fonts/OFL-Fraunces.txt](public/fonts/OFL-Fraunces.txt) |
| Schrift **DM Sans** (WOFF2, Achse wght) | The DM Sans Project Authors | SIL Open Font License 1.1 | [public/fonts/OFL-DM-Sans.txt](public/fonts/OFL-DM-Sans.txt) |

Die Lizenztexte werden mit der Seite unter `/fonts/` ausgeliefert. Alle übrigen ausgelieferten
Dateien (HTML, CSS, JavaScript, Icons, Illustrationen, Karte) sind eigene Werke.

## 2. Werkzeuge für Build und Tests (werden nicht ausgeliefert)

Insgesamt 327 npm-Pakete laut `package-lock.json` (alle als Entwicklungsabhängigkeit).

### Lizenzprüfung

- Starkes Copyleft (GPL, AGPL, SSPL, CC-BY-SA …): **keines** (sonst bricht die Prüfung ab).
- Schwaches Copyleft (LGPL, MPL): 29 Pakete, nur Werkzeuge, die beim Bauen oder Testen
  laufen und nicht mit der Seite verbreitet werden (z. B. libvips in sharp, libheif-js, axe-core,
  lightningcss). Daraus entsteht keine Pflicht, die Seite oder ihren Code offenzulegen.

### Pakete nach Lizenz

#### MIT (248)

`@astrojs/compiler-binding@0.5.3`, `@astrojs/compiler-binding-android-arm64@0.5.3`, `@astrojs/compiler-binding-darwin-arm64@0.5.3`, `@astrojs/compiler-binding-darwin-x64@0.5.3`, `@astrojs/compiler-binding-linux-arm64-gnu@0.5.3`, `@astrojs/compiler-binding-linux-arm64-musl@0.5.3`, `@astrojs/compiler-binding-linux-x64-gnu@0.5.3`, `@astrojs/compiler-binding-linux-x64-musl@0.5.3`, `@astrojs/compiler-binding-wasm32-wasi@0.5.3`, `@astrojs/compiler-binding-win32-arm64-msvc@0.5.3`, `@astrojs/compiler-binding-win32-x64-msvc@0.5.3`, `@astrojs/compiler-rs@0.5.3`, `@astrojs/internal-helpers@0.13.2`, `@astrojs/markdown-satteri@0.4.10`, `@astrojs/prism@4.1.2`, `@astrojs/runtime@0.1.2`, `@astrojs/telemetry@3.4.2`, `@astrojs/vite-plugin-astro@0.1.3`, `@babel/helper-string-parser@7.29.15`, `@babel/helper-validator-identifier@7.29.7`, `@babel/parser@7.29.15`, `@babel/types@7.29.15`, `@bruits/satteri-android-arm64@0.11.7`, `@bruits/satteri-darwin-arm64@0.11.7`, `@bruits/satteri-darwin-x64@0.11.7`, `@bruits/satteri-freebsd-x64@0.11.7`, `@bruits/satteri-linux-arm64-gnu@0.11.7`, `@bruits/satteri-linux-arm64-musl@0.11.7`, `@bruits/satteri-linux-x64-gnu@0.11.7`, `@bruits/satteri-linux-x64-musl@0.11.7`, `@bruits/satteri-wasm32-wasi@0.11.7`, `@bruits/satteri-win32-arm64-msvc@0.11.7`, `@bruits/satteri-win32-x64-msvc@0.11.7`, `@capsizecss/unpack@4.0.1`, `@clack/core@1.6.0`, `@clack/prompts@1.9.0`, `@emnapi/core@2.0.0-beta.2`, `@emnapi/core@1.11.1`, `@emnapi/core@1.11.3`, `@emnapi/runtime@2.0.0-beta.2`, `@emnapi/runtime@1.11.1`, `@emnapi/runtime@1.11.3`, `@emnapi/wasi-threads@2.2.0`, `@emnapi/wasi-threads@1.2.2`, `@emnapi/wasi-threads@1.2.3`, `@html-validate/stylish@6.1.0`, `@img/colour@1.1.0`, `@jridgewell/resolve-uri@3.1.3`, `@jridgewell/sourcemap-codec@1.6.0`, `@jridgewell/trace-mapping@0.3.31`, `@napi-rs/wasm-runtime@1.2.6`, `@napi-rs/wasm-runtime@1.2.7`, `@oslojs/encoding@1.1.0`, `@oxc-project/types@0.156.0`, `@oxc-project/types@0.159.0`, `@prettier/parse-srcset@3.1.0`, `@rolldown/binding-android-arm-eabi@1.2.19`, `@rolldown/binding-android-arm-eabi@1.3.3`, `@rolldown/binding-android-arm64@1.2.19`, `@rolldown/binding-android-arm64@1.3.3`, `@rolldown/binding-darwin-arm64@1.2.19`, `@rolldown/binding-darwin-arm64@1.3.3`, `@rolldown/binding-darwin-x64@1.2.19`, `@rolldown/binding-darwin-x64@1.3.3`, `@rolldown/binding-freebsd-x64@1.2.19`, `@rolldown/binding-freebsd-x64@1.3.3`, `@rolldown/binding-linux-arm-gnueabihf@1.2.19`, `@rolldown/binding-linux-arm-gnueabihf@1.3.3`, `@rolldown/binding-linux-arm64-gnu@1.2.19`, `@rolldown/binding-linux-arm64-gnu@1.3.3`, `@rolldown/binding-linux-arm64-musl@1.2.19`, `@rolldown/binding-linux-arm64-musl@1.3.3`, `@rolldown/binding-linux-ppc64-gnu@1.2.19`, `@rolldown/binding-linux-ppc64-gnu@1.3.3`, `@rolldown/binding-linux-s390x-gnu@1.2.19`, `@rolldown/binding-linux-s390x-gnu@1.3.3`, `@rolldown/binding-linux-x64-gnu@1.2.19`, `@rolldown/binding-linux-x64-gnu@1.3.3`, `@rolldown/binding-linux-x64-musl@1.2.19`, `@rolldown/binding-linux-x64-musl@1.3.3`, `@rolldown/binding-openharmony-arm64@1.2.19`, `@rolldown/binding-openharmony-arm64@1.3.3`, `@rolldown/binding-wasm32-wasi@1.2.19`, `@rolldown/binding-wasm32-wasi@1.3.3`, `@rolldown/binding-win32-arm64-msvc@1.2.19`, `@rolldown/binding-win32-arm64-msvc@1.3.3`, `@rolldown/binding-win32-x64-msvc@1.2.19`, `@rolldown/binding-win32-x64-msvc@1.3.3`, `@rolldown/pluginutils@1.1.1`, `@shikijs/core@4.6.0`, `@shikijs/engine-javascript@4.6.0`, `@shikijs/engine-oniguruma@4.6.0`, `@shikijs/langs@4.6.0`, `@shikijs/primitive@4.6.0`, `@shikijs/themes@4.6.0`, `@shikijs/types@4.6.0`, `@shikijs/vscode-textmate@10.1.0`, `@tybys/wasm-util@0.10.5`, `@types/chai@5.2.3`, `@types/deep-eql@4.0.2`, `@types/estree@1.0.10`, `@types/estree-jsx@1.0.5`, `@types/hast@3.0.5`, `@types/mdast@4.0.4`, `@types/nlcst@2.0.3`, `@types/unist@3.0.3`, `@vitest/mocker@5.1.1`, `@vitest/spy@5.1.1`, `ajv@8.20.0`, `am-i-vibing@0.5.0`, `assertion-error@2.0.1`, `astro@7.4.13`, `bail@2.0.2`, `ccount@2.0.1`, `chai@6.3.0`, `character-entities-html4@2.1.0`, `character-entities-legacy@3.0.0`, `chokidar@5.0.0`, `ci-info@4.5.0`, `clsx@2.1.1`, `comma-separated-tokens@2.0.3`, `commander@11.1.0`, `cookie@2.0.2`, `cookie-es@1.2.3`, `crossws@0.3.5`, `css-tree@3.2.1`, `css-tree@2.2.1`, `csso@5.0.5`, `defu@6.1.7`, `dequal@2.0.3`, `destr@2.0.5`, `devalue@6.0.3`, `devlop@1.1.0`, `dom-serializer@2.0.0`, `dset@3.1.4`, `es-module-lexer@3.0.5`, `es-module-lexer@2.3.2`, `estree-walker@3.0.3`, `extend@3.0.2`, `fast-deep-equal@3.1.3`, `fast-string-truncated-width@3.0.3`, `fast-string-width@3.0.2`, `fast-wrap-ansi@0.2.2`, `fdir@6.5.0`, `flattie@1.1.1`, `fnv1a-64@0.1.2`, `fontace@0.4.1`, `fontkitten@1.0.3`, `fsevents@2.3.3`, `get-tsconfig@5.0.0-beta.6`, `h3@1.15.11`, `hast-util-to-html@9.0.7`, `hast-util-whitespace@3.0.0`, `html-escaper@3.0.3`, `html-validate@11.21.1`, `html-void-elements@3.0.0`, `iron-webcrypto@1.2.1`, `is-docker@4.0.0`, `is-plain-obj@4.1.0`, `json-schema-traverse@1.0.0`, `jsonc-parser@3.3.1`, `kleur@4.1.5`, `kleur@3.0.3`, `magic-string@1.4.5`, `magicast@0.5.5`, `mdast-util-to-hast@13.2.2`, `micromark-util-character@2.1.1`, `micromark-util-encode@2.0.1`, `micromark-util-sanitize-uri@2.0.1`, `micromark-util-symbol@2.0.1`, `micromark-util-types@2.0.3`, `mri@1.2.0`, `mrmime@2.0.1`, `nanoid@3.3.20`, `neotraverse@1.0.2`, `nlcst-to-string@4.0.0`, `node-fetch-native@1.6.7`, `node-mock-http@1.0.5`, `normalize-path@3.0.0`, `obug@3.0.0`, `ofetch@1.5.1`, `oniguruma-parser@0.12.2`, `oniguruma-to-es@4.3.6`, `p-limit@7.3.3`, `p-queue@10.0.0`, `package-manager-detector@1.9.0`, `picomatch@2.3.2`, `picomatch@4.0.7`, `pngjs@6.0.0`, `postcss@8.5.33`, `prettier@3.10.1`, `prettier-plugin-astro@1.1.2`, `prismjs@1.30.0`, `process-ancestry@0.1.0`, `prompts@2.4.2`, `property-information@7.2.0`, `radix3@1.1.2`, `readdirp@5.1.1`, `regex@6.1.0`, `regex-recursion@6.0.2`, `regex-utilities@2.3.0`, `require-from-string@2.0.2`, `resolve-pkg-maps@1.0.0`, `retext-smartypants@6.2.0`, `rolldown@1.2.19`, `rolldown@1.3.3`, `s.color@0.0.15`, `sass-formatter@0.8.0`, `satteri@0.11.7`, `shiki@4.6.0`, `sisteransi@1.0.5`, `sisteransi@2.0.0`, `space-separated-tokens@2.0.2`, `std-env@4.3.0`, `stringify-entities@4.0.5`, `suf-log@2.5.3`, `svgo@4.1.0`, `tiny-inflate@1.0.3`, `tinybench@6.2.4`, `tinyclip@1.0.3`, `tinyexec@1.3.1`, `tinyglobby@0.2.17`, `tinyps@0.5.2`, `trim-lines@3.0.1`, `trough@2.2.0`, `ufo@1.6.4`, `ultrahtml@1.7.0`, `uncrypto@0.1.3`, `undici@8.13.1`, `unified@11.0.5`, `unifont@1.0.3`, `unist-util-is@6.0.1`, `unist-util-position@5.0.0`, `unist-util-stringify-position@4.0.0`, `unist-util-visit@5.2.0`, `unist-util-visit-parents@6.1.0`, `unstorage@1.17.6`, `verkit@0.5.0`, `vfile@6.0.3`, `vfile-message@4.0.4`, `vite@8.3.8`, `vitefu@1.1.4`, `vitest@5.1.1`, `why-is-node-running@3.2.1`, `xxhash-wasm@1.1.0`, `yocto-queue@1.2.2`, `zod@4.6.7`, `zwitch@2.0.4`

#### Apache-2.0 (21)

`@img/sharp-darwin-arm64@0.35.5`, `@img/sharp-darwin-x64@0.35.5`, `@img/sharp-freebsd-wasm32@0.35.5`, `@img/sharp-linux-arm@0.35.5`, `@img/sharp-linux-arm64@0.35.5`, `@img/sharp-linux-ppc64@0.35.5`, `@img/sharp-linux-riscv64@0.35.5`, `@img/sharp-linux-s390x@0.35.5`, `@img/sharp-linux-x64@0.35.5`, `@img/sharp-linuxmusl-arm64@0.35.5`, `@img/sharp-linuxmusl-x64@0.35.5`, `@img/sharp-webcontainers-wasm32@0.35.5`, `@playwright/test@1.65.1`, `@sidvind/better-ajv-errors@7.0.0`, `aria-query@5.3.2`, `axobject-query@4.1.0`, `detect-libc@2.1.2`, `expect-type@1.4.0`, `playwright@1.65.1`, `playwright-core@1.65.1`, `sharp@0.35.5`

#### MPL-2.0 (14)

`@axe-core/playwright@4.14.0`, `axe-core@4.14.1`, `lightningcss@1.33.0`, `lightningcss-android-arm64@1.33.0`, `lightningcss-darwin-arm64@1.33.0`, `lightningcss-darwin-x64@1.33.0`, `lightningcss-freebsd-x64@1.33.0`, `lightningcss-linux-arm-gnueabihf@1.33.0`, `lightningcss-linux-arm64-gnu@1.33.0`, `lightningcss-linux-arm64-musl@1.33.0`, `lightningcss-linux-x64-gnu@1.33.0`, `lightningcss-linux-x64-musl@1.33.0`, `lightningcss-win32-arm64-msvc@1.33.0`, `lightningcss-win32-x64-msvc@1.33.0`

#### ISC (10)

`@ungap/structured-clone@1.4.0`, `anymatch@3.1.3`, `boolbase@1.0.0`, `github-slugger@2.0.0`, `heic-convert@2.1.0`, `heic-decode@2.1.0`, `piccolore@0.1.3`, `picocolors@1.1.1`, `semver@7.8.6`, `yaml@2.9.1`

#### LGPL-3.0-or-later (10)

`@img/sharp-libvips-darwin-arm64@1.3.4`, `@img/sharp-libvips-darwin-x64@1.3.4`, `@img/sharp-libvips-linux-arm@1.3.4`, `@img/sharp-libvips-linux-arm64@1.3.4`, `@img/sharp-libvips-linux-ppc64@1.3.4`, `@img/sharp-libvips-linux-riscv64@1.3.4`, `@img/sharp-libvips-linux-s390x@1.3.4`, `@img/sharp-libvips-linux-x64@1.3.4`, `@img/sharp-libvips-linuxmusl-arm64@1.3.4`, `@img/sharp-libvips-linuxmusl-x64@1.3.4`

#### BSD-2-Clause (8)

`css-select@6.0.0`, `css-what@7.0.0`, `domelementtype@2.3.0`, `domhandler@5.0.3`, `domutils@3.2.2`, `entities@4.5.0`, `http-cache-semantics@4.3.0`, `nth-check@2.1.1`

#### BSD-3-Clause (5)

`diff@9.0.0`, `fast-uri@3.1.9`, `jpeg-js@0.4.4`, `smol-toml@1.9.1`, `source-map-js@1.2.4`

#### Apache-2.0 AND LGPL-3.0-or-later (3)

`@img/sharp-win32-arm64@0.35.5`, `@img/sharp-win32-ia32@0.35.5`, `@img/sharp-win32-x64@0.35.5`

#### BlueOak-1.0.0 (3)

`common-ancestor-path@2.0.0`, `lru-cache@11.5.3`, `sax@1.6.1`

#### CC0-1.0 (2)

`mdn-data@2.0.28`, `mdn-data@2.27.1`

#### 0BSD (1)

`tslib@2.9.1`

#### Apache-2.0 AND LGPL-3.0-or-later AND MIT (1)

`@img/sharp-wasm32@0.35.5`

#### LGPL-3.0 (1)

`libheif-js@1.23.5`

