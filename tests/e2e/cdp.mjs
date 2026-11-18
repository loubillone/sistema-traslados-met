// Driver mínimo de Chrome DevTools Protocol, sin dependencias externas: usa el
// WebSocket nativo de Node (22 o superior) y un Chrome/Edge instalado.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Abre el navegador en modo headless con un perfil propio (profileDir).
 * Nunca usa el perfil habitual del usuario: sus datos de localStorage no se tocan.
 */
export async function launchBrowser({ chromePath, port, profileDir, width = 1366, height = 900 }) {
  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${width},${height}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let target;
  for (let i = 0; i < 75 && !target; i += 1) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      // Todavía no responde.
    }
  }
  if (!target) {
    proc.kill();
    throw new Error("El navegador no respondió al protocolo DevTools.");
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 1;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      const details = msg.params.exceptionDetails;
      errors.push(details.exception?.description ?? details.text);
    } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const page = {
    send,
    errors,
    async eval(expression) {
      const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
      return res.result.value;
    },
    async waitFor(condition, timeout = 8000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          if (await page.eval(`Boolean(${condition})`)) return true;
        } catch {
          // Reintentar.
        }
        await sleep(100);
      }
      throw new Error(`Tiempo agotado esperando: ${condition}`);
    },
    async goto(url) {
      await send("Page.navigate", { url });
      await sleep(300);
      await page.waitFor("document.readyState === 'complete' && document.querySelector('#root')?.children.length > 0");
      // Espera a que termine la carga diferida de la pantalla (React.lazy).
      await page.waitFor("!document.querySelector('.page-loader')", 10000);
      await sleep(150);
    },
    async viewport(width, height, mobile = false) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      await sleep(250);
    },
    async screenshot(dir, name) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const file = join(dir, `${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      return file;
    },
    close() {
      try {
        ws.close();
      } catch {
        // Ignorar.
      }
      proc.kill();
    },
  };
  return page;
}

/** Funciones auxiliares inyectadas en cada página (window.__t). */
export const PAGE_HELPERS = `
window.__t = {
  q: (s) => document.querySelector(s),
  qa: (s) => [...document.querySelectorAll(s)],
  set(sel, value) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el) throw new Error("No existe " + sel);
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("focusout", { bubbles: true }));
    return true;
  },
  click(sel) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el) throw new Error("No existe " + sel);
    el.click();
    return true;
  },
  byText(selector, text) {
    return [...document.querySelectorAll(selector)].find((el) => el.textContent.trim().includes(text));
  },
  clickText(selector, text) {
    const el = this.byText(selector, text);
    if (!el) throw new Error("No existe " + selector + " con el texto " + text);
    el.click();
    return true;
  },
  text: (s) => document.querySelector(s)?.textContent.trim() ?? null,
  data: () => JSON.parse(localStorage.getItem("traslados-demo:datos")),
};
// La impresión se registra en lugar de abrir el diálogo del sistema.
window.__prints = [];
window.print = () => { window.__prints.push(document.title); window.dispatchEvent(new Event("afterprint")); };
true;
`;
