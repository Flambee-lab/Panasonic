# Camera selection variants

Three layouts of the Affected cameras pop-up, with the same camera data, selection, filtering and alphabetical ordering.

| Variant | Layout | Root command |
| --- | --- | --- |
| V1 | Existing dropdowns plus a second Filters row. | `npm run dev:cameras:v1` |
| V2 | Server, model, group and schedule dropdowns grouped under Time & Camera. | `npm run dev:cameras:v2` |
| V3 | Filters in an internal left sidebar, with cameras alongside. | `npm run dev:cameras:v3` |

Install dependencies with `npm ci` from the repository root, then run one of the commands above. All camera commands use port 5175 and open their selected variant. Run one camera command at a time.

While the application is running, switch variants using:

- <http://localhost:5175/?variant=1>
- <http://localhost:5175/?variant=2>
- <http://localhost:5175/?variant=3>

The variants share one application; edit the common camera logic and variant layouts here rather than maintaining three copies.

## Current scope

The existing server, model, group and schedule filters, text search, alphabetical sort and camera selection are implemented. Objects and Events open intentional placeholder panels; their filter criteria are pending the next design definition.

The background alarm rule screen provides context for the camera selector. It is not the complete Alarm Rules flow; use `alarm-rules-main-flow/` for that flow.

## Published previews

- [V1 — Second filter row](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=1)
- [V2 — Grouped filters](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=2)
- [V3 — Filter sidebar](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=3)

Run `npm run build` from the repository root to build all three sections. Source provenance is recorded in [`../SOURCE_VERSIONS.json`](../SOURCE_VERSIONS.json).
