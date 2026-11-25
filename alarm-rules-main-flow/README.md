# Alarm rules main flow

The iterated base version of Alarm Rules, including schedules, click or drag time selection, timeline refinements and the exception flow with consistent time inputs.

From the repository root:

```sh
npm ci
npm run dev:alarm-rules
```

The command opens <http://localhost:5173/alarm-rules>.

[Published preview](https://panasonic-modificado-milena.milexfx.chatgpt.site/alarm-rules)

Keep changes for this flow in this directory. The separate `exceptions/` directory contains the B2 exploration and does not share these components or styles at runtime.

Run `npm run build` from the repository root to build all three sections. Source provenance is recorded in [`../SOURCE_VERSIONS.json`](../SOURCE_VERSIONS.json).
