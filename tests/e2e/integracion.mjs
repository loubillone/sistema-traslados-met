// Recorrido de integración de punta a punta (CU-01 a CU-14) sobre el navegador.
// Crea datos ficticios propios ("Lucía Demostración") en el perfil temporal.

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Hora de hoy al menos 20 minutos más tarde, sin coincidir con los horarios redondos de la semilla. */
function horaLibreHoy() {
  const d = new Date(Date.now() + 20 * 60000);
  if (d.getDate() !== new Date().getDate() || d.getHours() * 60 + d.getMinutes() > 23 * 60 + 50) return null;
  let min = d.getMinutes();
  if (min % 5 === 0) min += 2;
  return `${pad(d.getHours())}:${pad(Math.min(min, 59))}`;
}

export async function integracion({ page, base, check, swal, sleep }) {
  const E = (expr) => page.eval(expr);
  const hoy = iso(new Date());
  const diaSemana = ((new Date().getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
  const hora = horaLibreHoy();
  const DNI = "41999888";

  if (!hora) {
    check("INT", "Recorrido de integración", false, "Se ejecutó demasiado cerca de la medianoche: vuelva a correrlo más tarde.");
    return;
  }

  // 1. Inicio de sesión (cuenta simulada única: admin / Administrador).
  await page.goto(`${base}/login`);
  await E("__t.set('#usuario','admin'); __t.set('#password','admin123'); true");
  await E("__t.click('button[type=submit]')");
  await page.waitFor("location.pathname === '/dashboard' && document.querySelector('.user-name') && document.querySelector('.stat-card')");
  check("INT-01", "Inicio de sesión con la cuenta de demostración", (await E("__t.text('.user-name')")) === "Administrador");
  const antes = await E("__t.data()");
  const statsAntes = await E("__t.qa('.stat-card').map(c => c.querySelector('.stat-card-value').textContent)");

  // 2. Registrar pasajero (CU-02).
  await page.goto(`${base}/pasajeros/nuevo`);
  await E(`(() => {
    __t.set('#pasajero-dni', '${DNI}');
    __t.set('#pasajero-nombre', 'Lucía');
    __t.set('#pasajero-apellido', 'Demostración');
    __t.set('#pasajero-telefono', '381-500-1234');
    __t.set('#pasajero-domicilio', 'Av. Mate de Luna 1500');
    __t.set('#pasajero-institucionId', 'INS-01');
    return true; })()`);
  await E("__t.click('form button[type=submit]')");
  await page.waitFor("/^\\/pasajeros\\/PAS-/.test(location.pathname)");
  await swal.confirm();
  const pasajeroId = await E("location.pathname.split('/').pop()");
  const conPasajero = await E("__t.data()");
  check("INT-02", "Pasajero registrado (CU-02)", conPasajero.pasajeros.some((p) => p.id === pasajeroId && p.dni === DNI), pasajeroId);

  // DNI duplicado: el formulario lo rechaza.
  await page.goto(`${base}/pasajeros/nuevo`);
  await E(`__t.set('#pasajero-dni', '${DNI}')`);
  await sleep(150);
  check("INT-02b", "Rechaza el DNI duplicado", (await E("__t.text('#pasajero-dni-error')"))?.includes("Ya existe"), await E("__t.text('#pasajero-dni-error')"));

  // 3. Búsqueda por DNI (CU-01): con un DNI exacto abre la ficha.
  await page.goto(`${base}/pasajeros`);
  await E(`__t.set('input[type=search][aria-label="Buscar pasajero por DNI o nombre"]', '${DNI}')`);
  await E("document.querySelector('form.passenger-search').requestSubmit()");
  await page.waitFor(`location.pathname === '/pasajeros/${pasajeroId}'`);
  check("INT-03", "Búsqueda por DNI abre la ficha (CU-01)", true, `${DNI} → ${pasajeroId}`);

  // 4. Turno recurrente (CU-10) el día de hoy.
  await page.goto(`${base}/agenda/nuevo`);
  await E(`(() => {
    __t.set('#turno-pasajeroId', '${pasajeroId}');
    __t.set('#turno-institucionId', 'INS-01');
    __t.click("input[name='dias'][value='${diaSemana}']");
    __t.set('#turno-tipo', 'ida');
    return true; })()`);
  await sleep(100);
  await E(`__t.set('#turno-horaIda', '${hora}')`);
  await sleep(100);
  await E("__t.click('form button[type=submit]')");
  await page.waitFor("/^\\/agenda\\/TUR-/.test(location.pathname)");
  await swal.confirm();
  const turnoId = await E("location.pathname.split('/').pop()");
  check("INT-04", "Turno recurrente registrado (CU-10)", (await E("__t.data()")).turnos.some((t) => t.id === turnoId && t.pasajeroId === pasajeroId), `${turnoId} · ${hora}`);

  // 5/6. Programar el viaje desde el turno y asignar chofer y vehículo (CU-04).
  await E(`__t.set('#programar-fecha', '${hoy}'); __t.set('#programar-tramo', 'ida'); true`);
  await sleep(150);
  await E("__t.clickText('button', 'Programar viaje')");
  await page.waitFor("location.pathname === '/viajes/nuevo' && document.querySelector('#viaje-choferId')");
  check("INT-05", "Formulario de viaje precargado desde el turno", (await E("document.querySelector('#viaje-hora').value")) === hora && (await E("document.querySelector('#viaje-pasajeroId').value")) === pasajeroId);
  await E("__t.set('#viaje-choferId', 'CHO-05'); __t.set('#viaje-vehiculoId', 'VEH-02'); true");
  await sleep(150);
  const erroresViaje = await E("__t.qa('.field-error').map(e => e.textContent)");
  check("INT-06", "Chofer y vehículo disponibles, sin errores", erroresViaje.length === 0, erroresViaje.join(" | "));
  await E("__t.click('form button[type=submit]')");
  await page.waitFor("/^\\/viajes\\/VIA-/.test(location.pathname)");
  await swal.confirm();
  const viajeId = await E("location.pathname.split('/').pop()");
  const viaje = (await E("__t.data()")).viajes.find((v) => v.id === viajeId);
  check("INT-06b", "Viaje guardado con turno, chofer y vehículo", viaje?.turnoId === turnoId && viaje.choferId === "CHO-05" && viaje.vehiculoId === "VEH-02" && viaje.estado === "programado", viajeId);

  // Sin duplicados: el mismo turno y día ya no puede programarse otra vez.
  await page.goto(`${base}/viajes/nuevo?turno=${turnoId}&fecha=${hoy}&tramo=ida`);
  await E("__t.click('form button[type=submit]')");
  await sleep(300);
  const duplicado = await E("__t.text('#viaje-fecha-error')");
  check("INT-06c", "No permite duplicar el viaje del turno", duplicado?.includes("Ya existe el viaje"), duplicado);
  check("INT-06d", "No se creó un segundo viaje", (await E("__t.data()")).viajes.filter((v) => v.turnoId === turnoId).length === 1);

  // 7. Consultar el viaje desde la ficha del pasajero.
  await page.goto(`${base}/pasajeros/${pasajeroId}`);
  check("INT-07", "La ficha del pasajero muestra el viaje", await E(`Boolean(document.querySelector('#viajes a[href="/viajes/${viajeId}"]'))`));

  // 8/9. Iniciar y finalizar el viaje (CU-05).
  await page.goto(`${base}/viajes/${viajeId}`);
  await E("__t.clickText('button', 'Iniciar viaje')");
  await swal.confirm();
  check("INT-08", "Viaje iniciado", (await E("__t.data()")).viajes.find((v) => v.id === viajeId).estado === "en_curso");
  await E("__t.clickText('button', 'Finalizar viaje')");
  await swal.confirm();
  check("INT-09", "Viaje finalizado", (await E("__t.data()")).viajes.find((v) => v.id === viajeId).estado === "finalizado");
  check("INT-09b", "Un viaje finalizado ya no ofrece cancelar ni editar", !(await E("Boolean(__t.byText('button', 'Cancelar viaje'))")) && !(await E("Boolean(__t.byText('a', 'Editar'))")));

  // 10. Registrar la asistencia (CU-08).
  await E("__t.clickText('button', 'Registrar asistencia')");
  await page.waitFor("document.querySelector(\"input[name='estado'][value='presente']\")");
  await E("__t.click(\"input[name='estado'][value='presente']\")");
  await E("__t.clickText('.app-modal button[type=submit]', 'Registrar asistencia')");
  await swal.confirm();
  const asistencias = (await E("__t.data()")).asistencias.filter((a) => a.viajeId === viajeId);
  check("INT-10", "Asistencia Presente registrada, una sola por viaje (CU-08)", asistencias.length === 1 && asistencias[0].estado === "presente");
  check("INT-10b", "Registrar la asistencia no cambió el estado del viaje", (await E("__t.data()")).viajes.find((v) => v.id === viajeId).estado === "finalizado");
  check("INT-10c", "El detalle ofrece editar (no duplicar) la asistencia", await E("Boolean(__t.byText('button', 'Editar asistencia'))"));

  // 11. Planilla del pasajero (CU-09).
  await page.goto(`${base}/asistencias?vista=planilla`);
  await E(`__t.set('#planilla-pasajero', '${pasajeroId}'); __t.set('#planilla-tipo', 'semanal'); true`);
  await sleep(100);
  await E(`__t.set('#planilla-fecha', '${hoy}')`);
  await E("__t.clickText('button[type=submit]', 'Generar')");
  await page.waitFor("document.querySelector('[data-testid=planilla]')");
  const planilla = await E("__t.text('[data-testid=planilla]')");
  check("INT-11", "Planilla generada con el viaje y la asistencia (CU-09)", planilla.includes("Demostración") && planilla.includes("Presente") && planilla.includes(DNI.replace(/\B(?=(\d{3})+(?!\d))/g, ".")));

  // 12. Gasto asociado al viaje finalizado (CU-13).
  await page.goto(`${base}/viajes/${viajeId}`);
  await E("__t.clickText('a.btn-app', 'Registrar gasto')");
  await page.waitFor("location.pathname === '/gastos/nuevo' && document.querySelector('[data-testid=viaje-seleccionado]')");
  check("INT-12a", "Gasto con el viaje y el vehículo del viaje precargados", (await E("__t.text('[data-testid=vehiculo-del-viaje]')"))?.startsWith("EF-456-GH"));
  await E("__t.set('#gasto-categoria', 'combustible'); __t.set('#gasto-monto', '18.250,50'); __t.set('#gasto-descripcion', 'Carga de combustible (demo)'); true");
  await sleep(100);
  await E("__t.click('form button[type=submit]')");
  await swal.confirm();
  await page.waitFor(`location.pathname === '/viajes/${viajeId}'`);
  check("INT-12", "Gasto registrado y visible en el viaje (CU-13)", (await E("__t.text('[data-testid=total-gastos-viaje]')")) === "$18.250,50");

  // 13. Presupuesto para el pasajero (CU-14).
  await page.goto(`${base}/presupuestos/nuevo?pasajero=${pasajeroId}`);
  await E("__t.set('#presupuesto-kilometros', '30'); __t.set('#presupuesto-tarifaKm', '250'); true");
  await sleep(100);
  check("INT-13a", "Total calculado antes de guardar (30 × $250)", (await E("__t.text('[data-testid=total-calculado]')")) === "$7.500");
  await E("__t.click('form button[type=submit]')");
  await swal.confirm();
  // Abierto con ?pasajero=, al guardar vuelve a la ficha del pasajero.
  await page.waitFor(`location.pathname === '/pasajeros/${pasajeroId}'`);
  const final = await E("__t.data()");
  check("INT-13", "Presupuesto guardado y vinculado al pasajero (CU-14)", final.presupuestos.some((p) => p.pasajeroId === pasajeroId && p.total === 7500));

  // Coherencia entre pantallas: la ficha muestra viaje, asistencia y presupuesto.
  await page.goto(`${base}/pasajeros/${pasajeroId}`);
  const ficha = await E("document.body.textContent");
  const enlaceViaje = await E(`Boolean(document.querySelector('#viajes a[href="/viajes/${viajeId}"]'))`);
  check("INT-13b", "Ficha coherente: viaje, asistencia y presupuesto", enlaceViaje && ficha.includes("$7.500") && ficha.includes("100%"));

  // 14. Indicadores del Panel Principal.
  await page.goto(`${base}/dashboard`);
  const stats = await E("__t.qa('.stat-card').map(c => c.querySelector('.stat-card-value').textContent)");
  check("INT-14a", "Panel: pasajeros registrados +1", Number(stats[0]) === Number(statsAntes[0]) + 1, `${statsAntes[0]} → ${stats[0]}`);
  check("INT-14b", "Panel: viajes de hoy +1", Number(stats[1]) === Number(statsAntes[1]) + 1, `${statsAntes[1]} → ${stats[1]}`);
  const asisHoy = final.asistencias.filter((a) => a.fecha === hoy);
  const pct = Math.round((asisHoy.filter((a) => a.estado === "presente").length * 100) / asisHoy.length);
  check("INT-14c", "Panel: porcentaje de asistencias del día coherente", stats[4] === `${pct}%`, `${stats[4]} (esperado ${pct}%)`);

  // Integridad final: sin relaciones rotas ni registros ajenos modificados.
  const ids = (c) => new Set(final[c].map((x) => x.id));
  const [pas, vij] = [ids("pasajeros"), ids("viajes")];
  check("INT-15", "Sin relaciones rotas", final.viajes.every((v) => pas.has(v.pasajeroId)) && final.asistencias.every((a) => vij.has(a.viajeId)) && final.gastos.every((g) => vij.has(g.viajeId)) && final.presupuestos.every((p) => pas.has(p.pasajeroId)));
  const ajenosAntes = JSON.stringify(antes.viajes.map((v) => [v.id, v.estado, v.choferId, v.vehiculoId]));
  const ajenosDespues = JSON.stringify(final.viajes.filter((v) => v.id !== viajeId).map((v) => [v.id, v.estado, v.choferId, v.vehiculoId]));
  check("INT-16", "Los demás viajes no se modificaron", ajenosAntes === ajenosDespues);

  return { pasajeroId, viajeId, dni: DNI };
}
