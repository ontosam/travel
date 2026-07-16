# Build tools

These scripts regenerate the app's static assets from the public-domain
[us-atlas](https://github.com/topojson/us-atlas) dataset. You normally don't
need to run them — the generated files are committed. Rebuild only if you want
to change the projection, labels, colors, or icon design.

```bash
cd tools
npm install
npm run build          # regenerates ../js/us-geo.js and ../icons/*
```

Individual steps:

```bash
npm run build:map      # -> ../js/us-geo.js  (state paths, borders, outline)
npm run build:icons    # -> ../icons/*       (icon.svg + PNGs, via sharp)
```

- `build-map.mjs` reads the Albers-projected `states-albers-10m.json` /
  `nation-albers-10m.json` from the `us-atlas` npm package, converts each state
  to an SVG path (keyed by 2-letter postal code) with `d3-geo`, and writes the
  `us-geo.js` module. The build is deterministic — re-running produces an
  identical file.
- `build-icons.mjs` draws the US silhouette from `US_OUTLINE` and rasterizes
  the PNG icons with `sharp`.

`node_modules/` here is git-ignored.
