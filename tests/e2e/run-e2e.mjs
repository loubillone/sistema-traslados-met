// Pruebas de navegador (opcionales): `npm run test:e2e`.
//
// - Levanta su propio servidor de Vite en un puerto libre (no usa `npm run dev`).
// - Abre Chrome o Edge en modo headless con un PERFIL TEMPORAL que se borra al
//   terminar: nunca lee ni modifica los datos guardados en su navegador habitual.
// - Ruta del navegador: variable CHROME_PATH, o se busca en las ubicaciones habituales.
// - Capturas opcionales: E2E_SCREENSHOTS=carpeta.
// - Servidor existente opcional: E2E_BASE_URL=http://127.0.0.1:4173 (p. ej. `npm run preview`).
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { launchBrowser, PAGE_HELPERS } from "./cdp.mjs";
import { integracion } from "./integracion.mjs";
import { casos } from "./casos.mjs";
import { humo } from "./humo.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path));
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const results = [];
const check = (id, name, ok, detail = "") => {
  results.push({ id, name, ok: Boolean(ok), detail });
  console.log(`${ok ? "✔" : "✖"} [${id}] ${name}${detail ? ` — ${detail}` : ""}`);
};

const chromePath = findBrowser();
if (!chromePath) {
  console.error("No se encontró Chrome ni Edge. Indique la ruta con la variable CHROME_PATH.");
  process.exit(2);
}
if (typeof WebSocket === "undefined") {
  console.error("Se necesita Node.js 22 o superior (WebSocket nativo).");
  process.exit(2);
}

const shotsDir = process.env.E2E_SCREENSHOTS || null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });
const profileDir = mkdtempSync(join(tmpdir(), "traslados-e2e-"));
// Con E2E_BASE_URL se prueba un servidor ya levantado (por ejemplo `npm run preview`
// para verificar el build de producción); si no, se levanta Vite en modo desarrollo.
const server = process.env.E2E_BASE_URL
  ? null
  : await createServer({ logLevel: "error", server: { host: "127.0.0.1", port: await freePort(), strictPort: true } });
await server?.listen();
const base = (process.env.E2E_BASE_URL ?? server.resolvedUrls.local[0]).replace(/\/$/, "");
console.log(`Servidor de prueba: ${base} · Navegador: ${chromePath}\n`);

let page;
try {
  page = await launchBrowser({ chromePath, port: await freePort(), profileDir });
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: PAGE_HELPERS });
  const swal = {
    async confirm() {
      await page.waitFor("document.querySelector('.swal2-popup.swal2-modal .swal2-confirm')");
      await page.eval("document.querySelector('.swal2-popup.swal2-modal .swal2-confirm').click()");
      await sleep(400);
    },
  };
  const ctx = { page, base, check, swal, sleep, shotsDir };

  console.log("— Recorrido de integración —");
  const creados = await integracion(ctx);
  console.log("\n— Otros casos de uso (CU-03, 05, 06, 07, 11, 12) —");
  await casos(ctx, creados);
  console.log("\n— Pasada de humo —");
  await humo(ctx);
  check("CONSOLA", "Sin errores de JavaScript en la consola", page.errors.length === 0, page.errors.slice(0, 3).join(" | "));
} catch (error) {
  check("EJECUCIÓN", "La prueba terminó sin interrupciones", false, error.message);
} finally {
  page?.close();
  await server?.close();
  await sleep(300);
  rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
if (failed.length) console.log("Fallaron:\n" + failed.map((f) => `  [${f.id}] ${f.name} — ${f.detail}`).join("\n"));
process.exit(failed.length ? 1 : 0);
