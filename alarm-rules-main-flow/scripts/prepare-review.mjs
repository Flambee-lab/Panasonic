import {copyFileSync, mkdirSync} from "node:fs";
copyFileSync("dist/alarm-rules.html", "dist/index.html");
for (const page of ["alarm-rules", "live-events", "monitor", "dashboard"]) {
 mkdirSync(`dist/${page}`, {recursive:true});
 copyFileSync(`dist/${page}.html`, `dist/${page}/index.html`);
}
