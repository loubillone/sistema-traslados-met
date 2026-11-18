// Pasada de humo: todas las pantallas cargan, sin errores, sin "Pacientes",
// sin desbordes horizontales en pantallas chicas, impresión y restauración.

const PANTALLAS = [
  ["/dashboard", "Panel Principal"],
  ["/pasajeros", "Gestión de Pasajeros"],
  ["/viajes", "Gestión de Viajes"],
  ["/asistencias", "Planilla de Asistencias"],
  ["/agenda", "Agenda de Turnos"],
  ["/choferes", "Gestión de Choferes"],
  ["/vehiculos", "Gestión de Vehículos"],
  ["/gastos", "Registro de Gastos"],
  ["/presupuestos", "Gestión de Presupuestos"],
];

export async function humo({ page, base, check, swal, sleep, shotsDir }) {
  const E = (expr) => page.eval(expr);

  await page.viewport(1366, 900);
  for (const [path, titulo] of PANTALLAS) {
    await page.goto(`${base}${path}`);
    const actual = await E("__t.text('.page-title')");
    check("HUMO", `Escritorio ${path}`, actual?.includes(titulo), actual);
    check("HUMO", `Sin "Pacientes" en ${path}`, !/pacientes?/i.test(await E("document.body.innerText")));
    if (shotsDir) await page.screenshot(shotsDir, `escritorio${path.replace(/\//g, "-")}`);
  }

  const data = await E("__t.data()");
  const detalles = [
    `/pasajeros/${data.pasajeros[0].id}`,
    `/viajes/${data.viajes.find((v) => v.estado === "finalizado").id}`,
    `/choferes/${data.choferes[0].id}`,
    `/vehiculos/${data.vehiculos[0].id}`,
    `/agenda/${data.turnos[0].id}`,
    `/gastos/${data.gastos[0].id}`,
    `/presupuestos/${data.presupuestos[0].id}`,
    "/pasajeros/nuevo",
    "/viajes/nuevo",
    "/agenda/nuevo",
    "/choferes/nuevo",
    "/vehiculos/nuevo",
    "/gastos/nuevo",
    "/presupuestos/nuevo",
  ];
  for (const path of detalles) {
    await page.goto(`${base}${path}`);
    check("HUMO", `Carga ${path}`, Boolean(await E("__t.text('.page-title')")) && !(await E("document.body.innerText")).includes("no encontrado"));
  }

  // Ruta inexistente: vuelve al Panel Principal.
  await page.goto(`${base}/ruta-inexistente`);
  check("HUMO", "Ruta inexistente redirige al Panel", (await E("location.pathname")) === "/dashboard");

  // Impresión del presupuesto: solo se ve el documento.
  await page.goto(`${base}/presupuestos/${data.presupuestos[0].id}`);
  await E("__t.clickText('button', 'Imprimir')");
  await sleep(200);
  check("HUMO", "Imprimir presupuesto llama a window.print()", (await E("window.__prints.length")) === 1);
  await page.send("Emulation.setEmulatedMedia", { media: "print" });
  const visibles = await E(`(() => { const v = (s) => { const el = document.querySelector(s); return Boolean(el) && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'; };
    return { doc: v('.budget-document'), menu: v('.sidebar'), encabezado: v('.app-header') }; })()`);
  await page.send("Emulation.setEmulatedMedia", { media: "" });
  check("HUMO", "Vista de impresión limpia", visibles.doc && !visibles.menu && !visibles.encabezado, JSON.stringify(visibles));

  // Pantallas chicas: sin desplazamiento horizontal de la página.
  for (const [w, h] of [[375, 812], [768, 1024]]) {
    await page.viewport(w, h, w < 500);
    for (const [path] of PANTALLAS) {
      await page.goto(`${base}${path}`);
      const exceso = await E("document.documentElement.scrollWidth - window.innerWidth");
      check("HUMO", `${w}px ${path} sin scroll horizontal`, exceso <= 0, `exceso=${exceso}px`);
      if (shotsDir && w === 375) await page.screenshot(shotsDir, `movil${path.replace(/\//g, "-")}`);
    }
  }
  await page.viewport(1366, 900);

  // Restaurar datos de demostración (en el perfil temporal de la prueba).
  await page.goto(`${base}/dashboard`);
  await E("__t.click('.user-menu-trigger')");
  await sleep(200);
  await E("__t.clickText('.menu-item', 'Restaurar datos de demostración')");
  await swal.confirm();
  await sleep(400);
  const restaurado = await E("__t.data()");
  check("HUMO", "Restaurar datos de demostración", restaurado.version === 8 && !restaurado.pasajeros.some((p) => p.apellido === "Demostración"));
}
