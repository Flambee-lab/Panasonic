import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const entries = [
  ["dev:alarm-rules", "http://localhost:5173/alarm-rules", "alarm-rules-root"],
  ["dev:exceptions", "http://localhost:5174/alarm-rules?section=exceptions", "alarm-rules-root"],
  ["dev:cameras:v1", "http://localhost:5175/?variant=1", "alarm-rules-root"],
  ["dev:cameras:v2", "http://localhost:5175/?variant=2", "alarm-rules-root"],
  ["dev:cameras:v3", "http://localhost:5175/?variant=3", "alarm-rules-root"],
];

// Exercise the commands a recipient actually runs, without opening a browser.
// Each process has its own group so nested npm/Vite children are also stopped.
for (const [command, url, rootId] of entries) {
  test(`${command} serves its entry point and module`, { timeout: 20_000 }, async () => {
    let logs = "";
    assert.ok(process.env.npm_execpath, "Run this check using npm test");
    const child = spawn(process.execPath, [process.env.npm_execpath, "run", command], {
      cwd: root,
      detached: !windows,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none", NO_COLOR: "1" },
    });
    child.stdout.on("data", chunk => { logs += chunk; });
    child.stderr.on("data", chunk => { logs += chunk; });
    try {
      let response;
      const deadline = Date.now() + 12_000;
      while (Date.now() < deadline) {
        assert.equal(child.exitCode, null, `Launch failed:\n${logs}`);
        if (!logs.includes("Local:")) {
          await delay(150);
          continue;
        }
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(500) });
          break;
        } catch {
          await delay(150);
        }
      }
      assert.ok(response, `Server did not start:\n${logs}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`id="${rootId}"`), "Expected flow root is missing");
      const entry = [...html.matchAll(/<script[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)]
        .map(match => match[1]).find(src => src.includes("/src/"));
      assert.ok(entry, "Expected application entry module is missing");
      const moduleResponse = await fetch(new URL(entry, url));
      assert.equal(moduleResponse.status, 200, "Entry module did not compile");
      assert.match(moduleResponse.headers.get("content-type"), /javascript/);
      assert.ok((await moduleResponse.text()).includes("createRoot"), "Entry module did not mount React");
    } finally {
      if (child.exitCode === null) {
        const exited = new Promise(resolve => child.once("exit", resolve));
        if (windows) {
          const stop = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
          await new Promise(resolve => { stop.once("error", resolve); stop.once("exit", resolve); });
        } else {
          try { process.kill(-child.pid, "SIGTERM"); } catch { /* Process already stopped. */ }
        }
        await Promise.race([exited, delay(2_000)]);
        if (child.exitCode === null) {
          try { process.kill(windows ? child.pid : -child.pid, "SIGKILL"); } catch { /* Process already stopped. */ }
        }
      }
    }
  });
}
