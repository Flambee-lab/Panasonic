# Panasonic UI flows

Three independent UI prototypes in one repository. This handoff lives on the `handoff/ui-flows` branch.

| Section | Directory | Purpose |
| --- | --- | --- |
| Alarm rules main flow | [`alarm-rules-main-flow/`](alarm-rules-main-flow/) | Iterated base flow for alarm rules, schedules and exceptions. |
| Exceptions | [`exceptions/`](exceptions/) | B2 exception creation: dates and hours together, followed by assignment to existing rules. |
| Camera selection variants | [`camera-selection-variants/`](camera-selection-variants/) | Three layouts for the same camera selection pop-up. |

## Get started

Use **Node.js 22.12 or newer** and npm.

```sh
git clone --branch handoff/ui-flows https://github.com/Flambee-lab/Panasonic.git
cd Panasonic
npm ci
```

Run commands from this repository's root. Choose the flow you want to review:

| Command | Local page |
| --- | --- |
| `npm run dev:alarm-rules` | <http://localhost:5173/alarm-rules> |
| `npm run dev:exceptions` | <http://localhost:5174/alarm-rules?section=exceptions> |
| `npm run dev:cameras:v1` | <http://localhost:5175/?variant=1> |
| `npm run dev:cameras:v2` | <http://localhost:5175/?variant=2> |
| `npm run dev:cameras:v3` | <http://localhost:5175/?variant=3> |

Each command opens its page. The three sections use separate ports, so you can review them side by side. The camera variants share one application and port; run one camera command at a time, then switch between `?variant=1`, `?variant=2` and `?variant=3` in the browser.

The npm workspace configuration installs the dependencies for all three sections with one root `npm ci`. Use `npm install` when intentionally updating dependencies; commit the updated root lockfile with those changes.

## Build and checks

```sh
npm run build
npm test
```

The build generates a `dist/` directory in each section. The tests cover the handoff entry-point contract and camera name ordering; they do not run the complete application browser flows.

## Published previews

| Preview | Link |
| --- | --- |
| Alarm rules main flow | [Base modified](https://panasonic-modificado-milena.milexfx.chatgpt.site/alarm-rules) |
| Exceptions | [B2 exceptions](https://panasonic-v2-milena.milexfx.chatgpt.site/alarm-rules?section=exceptions) |
| Camera selection V1 | [Second filter row](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=1) |
| Camera selection V2 | [Grouped filters](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=2) |
| Camera selection V3 | [Filter sidebar](https://panasonic-b3-milena.milexfx.chatgpt.site/?variant=3) |

## Development notes

Each section retains its own components, styles and assets. Changes to the main alarm rule flow and B2 exceptions should be made in their respective directories. The three camera layouts share the camera application and selection logic.

Objects and Events filter criteria in the camera explorations are pending design definition. Their placeholder panels are intentional; the existing camera dropdowns, search, alphabetical sorting and selection are implemented.

[`SOURCE_VERSIONS.json`](SOURCE_VERSIONS.json) records the published source versions used for this handoff. Local changes on this branch do not update the published previews automatically.
