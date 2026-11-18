// Casos de uso que no recorre el flujo de integración: CU-03 (edición y
// documentación), CU-05 (filtros), CU-06 (reasignar), CU-07 (cancelar),
// CU-11 (chofer) y CU-12 (vehículo).

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export async function casos({ page, base, check, swal, sleep }, { pasajeroId, dni } = {}) {
  const E = (expr) => page.eval(expr);
  const hoy = iso(new Date());
  const enUnAnio = iso(new Date(Date.now() + 365 * 86400000));
  const datos = await E("__t.data()");

  // CU-03: actualizar ficha (el DNI no se edita) y documentación simulada.
  const pid = pasajeroId ?? datos.pasajeros.find((p) => p.activo).id;
  await page.goto(`${base}/pasajeros/${pid}/editar`);
  check("CU-03", "En edición el DNI no puede modificarse", await E("document.querySelector('#pasajero-dni').disabled"));
  await E("__t.set('#pasajero-telefono', '381-500-9999')");
  await E("__t.click('form button[type=submit]')");
  await page.waitFor(`location.pathname === '/pasajeros/${pid}'`);
  await swal.confirm();
  check("CU-03", "Ficha actualizada", (await E("__t.data()")).pasajeros.find((p) => p.id === pid).telefono === "381-500-9999");
  const docsAntes = (await E("__t.data()")).pasajeros.find((p) => p.id === pid).documentos.length;
  await E(`(() => {
    const input = document.querySelector('[data-testid=documento-input]');
    const dt = new DataTransfer();
    dt.items.add(new File(['contenido ficticio'], 'Certificado_demo.pdf', { type: 'application/pdf' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true; })()`);
  await sleep(300);
  const docs = (await E("__t.data()")).pasajeros.find((p) => p.id === pid).documentos;
  const nuevoDoc = docs.at(-1);
  check("CU-03", "Documento registrado (solo metadatos, sin contenido)", docs.length === docsAntes + 1 && nuevoDoc.nombre === "Certificado_demo.pdf" && nuevoDoc.simulado === true && !("contenido" in nuevoDoc));

  // CU-05: historial con filtros combinables (en la URL).
  if (dni) {
    await page.goto(`${base}/viajes?pasajero=${dni}`);
    const filas = await E("__t.qa('.app-table tbody tr').length");
    check("CU-05", "Filtro de viajes por DNI del pasajero", filas >= 1 && (await E("__t.text('.app-table tbody')")).includes("Demostración"), `${filas} fila(s)`);
  }
  await page.goto(`${base}/viajes?estado=cancelado`);
  const estados = await E("__t.qa('.app-table tbody tr .status-badge').map(b => b.textContent)");
  check("CU-05", "Filtro de viajes por estado", estados.length > 0 && estados.every((e) => e === "Cancelado"), `${estados.length} fila(s)`);

  // CU-06: reasignar chofer en un viaje programado futuro.
  const futuros = datos.viajes.filter((v) => v.estado === "programado" && v.fecha > hoy).slice(0, 2);
  const [aReasignar, aCancelar] = futuros;
  await page.goto(`${base}/viajes/${aReasignar.id}`);
  await E("__t.clickText('button', 'Reasignar chofer')");
  await page.waitFor("document.querySelector('.swal2-select')");
  const opcion = await E(`[...document.querySelectorAll('.swal2-select option')].find(o => o.value && o.value !== '${aReasignar.choferId}' && o.textContent.includes('— disponible'))?.value`);
  await E(`__t.set('.swal2-select', '${opcion}')`);
  await swal.confirm(); // Continuar
  await swal.confirm(); // Reasignar
  const reasignado = (await E("__t.data()")).viajes.find((v) => v.id === aReasignar.id);
  check("CU-06", "Chofer reasignado con registro en el historial", reasignado.choferId === opcion && reasignado.eventos.some((e) => e.tipo === "reasignacion"), `${aReasignar.choferId} → ${opcion}`);

  // CU-07: cancelar con motivo obligatorio.
  await page.goto(`${base}/viajes/${aCancelar.id}`);
  await E("__t.clickText('button', 'Cancelar viaje')");
  await page.waitFor("document.querySelector('.swal2-textarea')");
  await E("document.querySelector('.swal2-confirm').click()");
  await sleep(300);
  check("CU-07", "La cancelación exige motivo", (await E("__t.text('.swal2-validation-message')"))?.includes("motivo"));
  await E("__t.set('.swal2-textarea', 'Aviso de la familia (prueba de auditoría)')");
  await swal.confirm();
  const cancelado = (await E("__t.data()")).viajes.find((v) => v.id === aCancelar.id);
  check("CU-07", "Viaje cancelado con motivo y conservado", cancelado.estado === "cancelado" && cancelado.motivoCancelacion.includes("auditoría"));
  check("CU-07", "Un viaje cancelado ya no ofrece acciones de estado", !(await E("Boolean(__t.byText('button', 'Iniciar viaje'))")) && !(await E("Boolean(__t.byText('button', 'Cancelar viaje'))")));

  // CU-11: registrar chofer y rechazar el DNI duplicado.
  await page.goto(`${base}/choferes/nuevo`);
  await E(`(() => {
    __t.set('#chofer-dni', '30999111'); __t.set('#chofer-nombre', 'Raúl'); __t.set('#chofer-apellido', 'Auditoría');
    __t.set('#chofer-telefono', '381-400-1111'); __t.set('#chofer-licencia', 'B-30999111');
    __t.set('#chofer-categoriaLicencia', 'D1'); __t.set('#chofer-vencimientoLicencia', '${enUnAnio}');
    return true; })()`);
  await sleep(150);
  await E("__t.click('form button[type=submit]')");
  await page.waitFor("/^\\/choferes\\/CHO-/.test(location.pathname)");
  await swal.confirm();
  check("CU-11", "Chofer registrado", (await E("__t.data()")).choferes.some((c) => c.dni === "30999111" && c.activo));
  await page.goto(`${base}/choferes/nuevo`);
  await E("__t.set('#chofer-dni', '30999111')");
  await sleep(150);
  check("CU-11", "Rechaza el DNI de chofer duplicado", (await E("__t.text('#chofer-dni-error')"))?.includes("Ya existe"));

  // CU-12: registrar vehículo y rechazar la patente duplicada.
  await page.goto(`${base}/vehiculos/nuevo`);
  await E(`(() => {
    __t.set('#vehiculo-patente', 'QQ-321-RR'); __t.set('#vehiculo-tipo', 'Combi'); __t.set('#vehiculo-capacidad', '9');
    __t.set('#vehiculo-vencimientoVTV', '${enUnAnio}'); __t.set('#vehiculo-aseguradora', 'Aseguradora Demo');
    __t.set('#vehiculo-poliza', 'DEMO-0001'); __t.set('#vehiculo-vencimientoSeguro', '${enUnAnio}');
    return true; })()`);
  await sleep(150);
  await E("__t.click('form button[type=submit]')");
  await page.waitFor("/^\\/vehiculos\\/VEH-/.test(location.pathname)");
  await swal.confirm();
  check("CU-12", "Vehículo registrado", (await E("__t.data()")).vehiculos.some((v) => v.patente === "QQ-321-RR"));
  await page.goto(`${base}/vehiculos/nuevo`);
  await E("__t.set('#vehiculo-patente', 'qq321rr')");
  await sleep(150);
  check("CU-12", "Rechaza la patente duplicada (escrita en otro formato)", (await E("__t.text('#vehiculo-patente-error')"))?.includes("ya está registrada"));
}
