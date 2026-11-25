# Exceptions

The B2 exception flow: enter a name, choose dates and hours together, then select the existing alarm rules to which the exception applies. It includes the compact applied-time summary, rule selection cards and grouped unavailable rules.

From the repository root:

```sh
npm ci
npm run dev:exceptions
```

The command opens <http://localhost:5174/alarm-rules?section=exceptions> directly in the Exceptions section.

[Published preview](https://panasonic-v2-milena.milexfx.chatgpt.site/alarm-rules?section=exceptions)

Keep B2 changes in this directory. The `alarm-rules-main-flow/` directory contains the iterated base version as a separate application.

Run `npm run build` from the repository root to build all three sections. Source provenance is recorded in [`../SOURCE_VERSIONS.json`](../SOURCE_VERSIONS.json).
