# Guía para la muestra — Sistema de Gestión de Traslados Programados

Guion práctico para presentar la demostración en **5 a 10 minutos**. Todos los pasos
están verificados con las pruebas automatizadas del proyecto (`npm test` y
`npm run test:e2e`).

> Recordatorio para el público: es una **demostración académica** con datos
> ficticios. El inicio de sesión es simulado y los datos se guardan solo en el navegador.

---

## 1. Antes de la muestra (el día de la presentación)

- [ ] `npm install` (solo si es otra computadora o se borró `node_modules`).
- [ ] `npm run build`: deja lista la versión de respaldo (ver sección 7).
- [ ] `npm run dev` y abrir la dirección que indica la consola (normalmente <http://localhost:5173>).
- [ ] **Usar un perfil de navegador dedicado a la muestra** (por ejemplo, un perfil de
      Chrome llamado "Muestra"). Así sus datos de trabajo no se tocan.
- [ ] En ese perfil: menú de usuario → **Restaurar datos de demostración**. Las fechas,
      los "viajes de hoy" y los vencimientos se recalculan para el día de la muestra.
- [ ] Ventana maximizada, zoom del navegador al 100 %.
- [ ] Tener a mano esta guía y las credenciales.

**Credenciales:** usuario `admin` · contraseña `admin123`.

La aplicación funciona sin internet una vez instalada: no usa servicios externos y
la tipografía está incluida.

---

## 2. Datos ficticios para usar

**Ya cargados en la demostración:**

| Para mostrar | Dato |
|--------------|------|
| Búsqueda por DNI | **12345678** → María González (con viajes, asistencias y presupuestos) |
| Pasajero inactivo (historial conservado) | Ramiro Vega |
| Vehículo en mantenimiento (no se puede asignar) | MN-012-OP (Renault Master) |
| Vencimientos próximos (alertas en rojo) | IJ-789-KL: seguro en 8 días y VTV en 15 · Patricia González: licencia en 25 días |
| Chofer de guardia (se puede asignar) | Miguel Fernández |

**Para cargar durante la muestra:**

| Dato | Valor sugerido |
|------|----------------|
| Pasajero nuevo | **Lucía Demostración**, DNI **41999888**, tel. 381-500-1234, Av. Mate de Luna 1500, destino Centro de Rehabilitación Norte |
| Turno | Día de **hoy**, tipo **Ida**, horario **30 minutos más tarde** que la hora actual |
| Asignación del viaje | Chofer **Miguel Fernández** · vehículo **EF-456-GH** |
| Gasto | Combustible · **18.250,50** · "Carga de combustible" |
| Presupuesto | **45 km × $250 = $11.250** (valor demostrativo, no es una tarifa real) |

Si se repite la muestra sin restaurar, el DNI 41999888 ya existirá: restaure los datos
o use otro DNI de 7 u 8 dígitos (por ejemplo, 41999889).

---

## 3. Recorrido sugerido (≈ 8 minutos)

| Tiempo | Pantalla | Qué hacer y qué decir |
|--------|----------|------------------------|
| 0:30 | **Login** | Ingresar con `admin` / `admin123`. Comentar que el inicio de sesión es simulado. |
| 1:00 | **Panel Principal** | Indicadores del día (pasajeros, viajes de hoy, choferes en viaje, vehículos activos, asistencias). Gráficos mensuales. Campana de notificaciones (vencimientos). Buscador superior: escribir "González". |
| 1:30 | **Pasajeros** (CU-01, CU-02) | Buscar **12345678** + Enter: se abre la ficha de María González (historial de viajes, asistencias, presupuestos y documentación). Volver y pulsar **Nuevo Pasajero**: cargar a Lucía Demostración. Mostrar que con el DNI 12345678 aparece "Ya existe un pasajero con este DNI". |
| 1:30 | **Agenda de Turnos** (CU-10, CU-04) | **Nuevo Turno** para Lucía: día de hoy, Ida, horario +30 min. En el detalle del turno, **Programar viaje** con fecha de hoy. En el formulario elegir Miguel Fernández y EF-456-GH y guardar. Volver al turno: la fecha ya figura con su viaje y no permite duplicarlo. |
| 1:30 | **Viajes** (CU-05) | En el detalle del viaje: **Iniciar viaje** → **Finalizar viaje** (historial de cambios). **Registrar asistencia** → Presente. Comentar que la asistencia no cambia el estado del viaje y que es una sola por viaje. |
| 0:45 | **Asistencias** (CU-08, CU-09) | **Generar Planilla** → pasajero Lucía, Semanal, fecha de hoy → **Generar**. Mostrar el botón Imprimir. |
| 0:45 | **Gastos** (CU-13) | Desde el detalle del viaje: **Registrar gasto** (viaje y vehículo precargados) → Combustible 18.250,50. Mostrar "Gastos asociados" y luego el módulo Gastos (total mensual, gráfico, tarjetas por categoría). |
| 0:45 | **Presupuestos** (CU-14) | Desde la ficha de Lucía → **Nuevo Presupuesto**: 45 km y $250 → el total ($11.250) aparece antes de guardar. Abrir el presupuesto → **Imprimir** o **Guardar PDF** (en el diálogo elegir "Guardar como PDF"). |
| 0:15 | **Panel Principal** | Los indicadores cambiaron: un pasajero y un viaje de hoy más. |

### Si sobra tiempo

- **Reasignar chofer (CU-06)** en un viaje programado futuro: la lista indica qué
  choferes están disponibles para esa fecha y hora.
- **Cancelar viaje (CU-07)**: exige un motivo y el viaje se conserva en el historial.
- **Vehículos (CU-12)**: alertas de vencimiento. Al programar un viaje, MN-012-OP
  figura como "— en mantenimiento" y, si se elige, el formulario no permite guardar.
  Intentar registrar la patente "ab123cd" muestra "La patente ya está registrada".
- **Choferes (CU-11)**: semáforo de vencimiento de licencias y disponibilidad (De guardia, No disponible).
- **Ficha del pasajero (CU-03)**: Editar (el DNI no se puede modificar) y adjuntar un
  documento (se guardan solo sus datos: nombre, tipo, tamaño y fecha).
- **Responsive**: achicar la ventana; el menú lateral pasa a ser un panel desplegable.

---

## 4. Funcionalidades para destacar

- Los datos son **coherentes entre pantallas**: un cambio en un viaje se ve en la
  ficha del pasajero, la agenda, las asistencias, los gastos y el panel.
- **Validaciones de integridad**: DNI y patentes duplicados, choferes no disponibles
  o con licencia vencida, vehículos en mantenimiento o con VTV/seguro vencidos,
  choques de horario, viajes duplicados desde turnos, asistencias duplicadas.
- **Registros históricos**: los viajes finalizados y cancelados no se modifican. Las
  bajas de pasajeros, choferes y vehículos son lógicas, así que su historial se conserva.
- **Cálculos monetarios exactos** (en centavos) en gastos y presupuestos, con formato argentino.
- **Persistencia**: recargar la página (F5) no pierde nada.

---

## 5. Advertencias durante la muestra

- Un viaje solo puede **iniciarse el día de su fecha**: por eso el turno se crea para hoy.
- El horario del turno y del viaje debe ser **posterior a la hora actual**.
- Los gastos solo se asocian a viajes **en curso o finalizados**.
- Los presupuestos solo se emiten a pasajeros **activos**.
- Los diálogos de confirmación (SweetAlert2) deben aceptarse para que la acción se guarde.

---

## 6. Recuperar los datos si algo se modifica

- **Menú de usuario → Restaurar datos de demostración → Restaurar.** Vuelve todo al
  estado inicial con las fechas del día (borra lo cargado en ese navegador).
- Si la pantalla quedara en blanco o con datos inconsistentes: recargar con
  **Ctrl + F5**. Si persiste, borrar los datos del sitio (herramientas del navegador
  → Aplicación → Almacenamiento → Borrar datos del sitio) y volver a ingresar.
- Para no perder los datos de trabajo, usar siempre el perfil de navegador dedicado
  a la muestra.

---

## 7. Si falla el servidor de desarrollo

1. **Leer la consola.** Si el puerto 5173 está ocupado, Vite usa el siguiente (5174,
   5175...): abrir la dirección que indica.
2. **Reiniciar:** `Ctrl + C` en la terminal y volver a ejecutar `npm run dev`.
3. **Faltan dependencias** ("Cannot find module"): ejecutar `npm install` y reintentar.
4. **Versión de Node:** `node -v` debe ser 22 o superior (mínimo 20.19 para Vite).
5. **Plan B, sin servidor de desarrollo:** con el build preparado antes de la muestra,
   ejecutar `npm run preview` y abrir <http://localhost:4173>. Es la misma
   aplicación, optimizada. Los datos son los del navegador, porque viven en
   `localStorage` y no en el servidor. Ojo: cada dirección (puerto) tiene su propio
   almacenamiento, así que la primera vez en 4173 aparecen los datos de demostración.
6. Si nada funciona: mostrar las capturas de diseño de `referencias-figma/` y explicar
   la arquitectura con `README.md` y `PROGRESO.md`.
