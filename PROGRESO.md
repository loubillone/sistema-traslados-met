# Progreso del proyecto — Sistema de Gestión de Traslados Programados

Proyecto académico (UTN FRT). Aplicación web de una sola página (SPA) para administrar
pasajeros, viajes, asistencias, agenda de turnos, choferes, vehículos, gastos y
presupuestos de un servicio de traslados programados.

> **No es un sistema de producción.** Es una demostración funcional con datos
> ficticios, inicio de sesión simulado y persistencia en `localStorage`.

**Estado actual:** ✅ módulos funcionales completados (etapas 1 a 5C.2) y **auditoría
final realizada (Etapa 6)**: los 14 casos de uso están verificados con pruebas
automatizadas. Lista para la muestra académica (ver [GUIA_DEMO.md](GUIA_DEMO.md)).
**Rama de trabajo:** `develop` · **Última verificación (Etapa 6):** `npm run build`,
`npm run lint`, `npm test` (57/57) y `npm run test:e2e` (96/96, en desarrollo y en el
build de producción), sin errores de consola.

---

## 1. Etapas completadas

| Etapa | Módulo | Contenido principal | Versión de datos |
|-------|--------|---------------------|:----------------:|
| 1 | Estructura y Panel Principal | Layout con menú lateral contraíble, encabezado con búsqueda global, notificaciones y menú de usuario. Login simulado con "Recordarme". Panel con indicadores, gráficos mensuales de viajes y asistencias (Recharts) y viajes recientes. | v1 |
| 2 | Pasajeros (CU-02, CU-03) | Listado con búsqueda y paginación, alta y edición con validaciones (DNI, teléfono, etc.), ficha completa con agenda habitual, historial de viajes y asistencias, presupuestos (solo lectura) y documentación simulada. Desactivación y reactivación sin borrar historial (se cancelan los viajes futuros programados). | v2 |
| 3 | Viajes (CU-04 a CU-07) | Historial con filtros guardados en la URL, alta y edición, detalle con línea de tiempo de cambios, transiciones de estado (programado → en curso → finalizado / cancelado con motivo), reasignación de chofer. Detección de choques de horario de pasajero, chofer y vehículo. | v3 |
| 4 | Asistencias (CU-08, CU-09) | Planilla diaria, calendario mensual con resumen, planilla por pasajero (semanal/mensual), estadísticas. Registro y edición desde la planilla, el calendario o el detalle del viaje. Motivo de ausencia/justificación separado de las observaciones. "Sin registrar" no equivale a "Ausente". | v4 |
| 5A | Choferes y Vehículos (CU-11, CU-12) | Tarjetas de choferes y tabla de la flota con indicadores. Alta, edición y baja lógica. Disponibilidad del chofer, categoría de licencia, datos del seguro del vehículo. Semáforo de vencimientos (licencia, VTV, seguro) y aviso de viajes futuros afectados. Historial de viajes por recurso. | v5 |
| 5B | Agenda de Turnos (CU-10) | Turnos recurrentes (días y horarios de ida/vuelta) por pasajero. Calendario semanal calculado a partir de los turnos, con filtros. Programación de viajes concretos desde una ocurrencia. Desactivación/reactivación; estado "Suspendido" si el pasajero está inactivo. | v6 |
| 5C.1 | Gastos (CU-13) | Tablero con total mensual, gráfico de torta por categoría (Recharts) y tarjetas de Combustible, Mantenimiento, Peajes, Limpieza y Extras (colores e íconos de Figma). Tabla con filtros por mes, vehículo y categoría (guardados en la URL) y paginación. Alta, detalle, edición y eliminación con confirmación. Cada gasto se asocia a un viaje en curso o finalizado; el vehículo se obtiene del viaje. Sección "Gastos asociados" en el detalle del viaje, con total y acceso para registrar con el viaje precargado. | v7 |
| 5C.2 | Presupuestos (CU-14) | Historial con filtros por pasajero y período (en la URL), paginación y totales de lo filtrado (importes presupuestados, no cobrados). Cálculo en vivo TOTAL = km × tarifa en centavos enteros. Alta, detalle, edición (el pasajero queda fijo) y eliminación con confirmación. Vista presentable "Transporte Acosta — Presupuesto de Traslado" que se imprime sola con `window.print()` y se guarda como PDF con el diálogo del navegador. Ficha del pasajero con historial, acciones y "Nuevo Presupuesto" precargado. | v8 |
| 6 | Auditoría final | Verificación de los 14 casos de uso y del recorrido de integración completo. Limpieza del código muerto (vista provisional `ModulePlaceholder`, `PENDING_MODULES`, `formatCurrency` y sus estilos). Carga diferida de pantallas (`React.lazy`). Ajuste visual del Panel. Pruebas reproducibles en el repositorio (`npm test`, `npm run test:e2e`). README, PROGRESO y GUIA_DEMO actualizados. | v8 (sin cambios) |

Todos los módulos del menú están implementados.

---

## 2. Arquitectura

### Stack
- **React 19** + **Vite 8** (build) + **React Router 7** (rutas; cada pantalla se carga
  bajo demanda con `React.lazy` y un indicador de carga dentro del layout).
- **Bootstrap 5** y CSS propio por módulo (`src/styles/`), con variables en `variables.css`.
- **lucide-react** (íconos), **Recharts** (gráficos), **SweetAlert2** (diálogos y avisos).
- **oxlint** como linter (`.oxlintrc.json`).
- Sin backend: los datos viven en el navegador.

### Estructura de carpetas

```
src/
├── App.jsx              Definición de rutas (públicas y protegidas)
├── main.jsx             Punto de entrada: Router + AuthProvider + DataProvider
├── config/              Menú lateral y metadatos de módulos (navigation.js)
├── constants/           Catálogos de estados, tipos y reglas (estados, agenda, recursos, pasajeros, gastos, presupuestos)
├── context/             AuthProvider (sesión simulada) y DataProvider (estado global)
├── data/                mockData.js (datos semilla) y migrations.js (migración entre versiones)
├── hooks/               Acciones de dominio (useTripActions, useResourceActions, ...) y acceso a contextos
├── utils/               Reglas de negocio puras (trips, attendance, schedules, resources, selectors, ...)
├── components/
│   ├── common/          Componentes reutilizables (DataTable, StatusBadge, campos de formulario, ...)
│   ├── layout/          Layout, Sidebar, Header, búsqueda global, notificaciones
│   ├── routing/         ProtectedRoute / PublicOnlyRoute
│   └── <módulo>/        Componentes específicos de cada módulo
├── pages/               Una carpeta por módulo: listado, detalle y formulario
└── styles/              CSS global y por módulo
tests/
├── unit/                Pruebas unitarias (node:test) sobre la semilla de una fecha fija
├── e2e/                 Pruebas de navegador (driver CDP propio, perfil temporal)
└── support/             Resolución de imports para Node y datos de prueba
```

### Flujo de datos
1. `DataProvider` mantiene **un único estado global** con `useReducer`
   (colecciones: `pasajeros`, `viajes`, `asistencias`, `choferes`, `vehiculos`,
   `instituciones`, `presupuestos`, `turnos`, `gastos`, `notificacionesLeidas`).
2. Cada cambio se persiste en `localStorage` (clave `traslados-demo:datos`).
3. Las pantallas leen con `useData()` y modifican mediante `addItem`, `updateItem`,
   `updateMany` y `removeItem`. Las acciones con reglas de negocio están en los hooks
   `use*Actions`.
4. Indicadores, contadores, notificaciones y ocurrencias de la agenda **se calculan**
   en `utils/` a partir del estado; no se guardan copias.

### Rutas
`/login` (pública) y, dentro del layout protegido: `/dashboard`, `/pasajeros`,
`/viajes`, `/asistencias`, `/agenda`, `/choferes`, `/vehiculos`, `/gastos`,
`/presupuestos`, cada una con `/nuevo`, `/:id` y `/:id/editar` cuando corresponde.
Precargas: `/gastos/nuevo?viaje=ID` y `/presupuestos/nuevo?pasajero=ID`;
`/presupuestos/:id?accion=imprimir|pdf` abre directamente la impresión. Cualquier otra
ruta redirige a `/dashboard`.

---

## 3. Decisiones técnicas

- **Estado global único + persistencia local.** Un solo `DataProvider` garantiza que
  un cambio (p. ej., cancelar un viaje) se refleje en todas las pantallas. Se eligió
  `localStorage` porque el alcance académico no incluye backend.
- **Datos versionados con migraciones.** `DATA_VERSION` (hoy 8) se incrementa en cada
  etapa que cambia la estructura. `migrations.js` agrega campos y colecciones nuevas
  **sin regenerar ni perder** viajes, asistencias u otros registros del usuario.
- **Datos semilla relativos a la fecha actual y determinísticos.** Siempre hay viajes
  de hoy, historial reciente y viajes próximos; para una misma fecha se generan los
  mismos datos. Todos los datos son ficticios. Se pueden restaurar desde el menú de usuario.
- **Relaciones por identificador.** Viajes, asistencias y turnos guardan `pasajeroId`,
  `choferId`, `vehiculoId`, `institucionId`, `viajeId`; los datos relacionados se
  resuelven al mostrarlos (sin duplicación). IDs con prefijo (`PAS-001`, `VIA-00001`, ...).
- **Reglas de negocio en funciones puras** (`utils/`), separadas de los componentes,
  lo que facilita revisarlas y reutilizarlas entre pantallas.
- **Bajas lógicas.** Pasajeros, choferes, vehículos y turnos se desactivan; nunca se
  borra el historial asociado.
- **Turno ≠ Viaje.** Un turno es una programación habitual; las ocurrencias semanales
  se calculan y solo se convierten en viaje cuando el usuario lo programa.
- **Una asistencia por viaje**, vinculada por `viajeId`. Las acciones sobre viajes no
  crean ni modifican asistencias.
- **Gastos por viaje (Etapa 5C.1).** Cada gasto guarda `viajeId`, fecha, categoría,
  monto y descripción; el **vehículo no se guarda**, se obtiene del viaje. Solo admiten
  gastos los viajes en curso o finalizados, que ya no se editan ni se reasignan, así
  que el vehículo del gasto no cambia. Un viaje puede tener varios gastos y registrar
  uno nunca modifica el viaje. El detalle del viaje y el módulo Gastos leen la misma
  colección. La fecha del gasto va del día del viaje a hoy. Montos en ARS con hasta
  2 decimales (acepta `15.500`, `15500,50`).
- **Presupuestos (Etapa 5C.2).** Cada presupuesto guarda `pasajeroId`, fecha de emisión,
  destino opcional (`institucionId`), `kilometros`, `tarifaKm`, `total` y observaciones.
  El total se obtiene **siempre** con `calcularTotal` (`utils/budgets.js`): km en
  centésimos × tarifa en centavos, redondeado al centavo con enteros. Formulario,
  detalle, historial, ficha e impresión usan esa misma función y el mismo valor
  guardado. Los textos se leen con separadores argentinos (`45,5`, `1.250,50`) sin
  pasar por `parseFloat`. En edición el pasajero no se puede cambiar. Guardar un
  presupuesto no crea viajes. La migración v7→v8 conserva los 13 presupuestos de la
  Etapa 2 (sin regenerarlos ni duplicarlos), agrega `observaciones` y solo corrige un
  total que no coincida con km × tarifa.
- **Impresión sin librerías.** La vista del presupuesto lleva la clase `print-area` y
  reutiliza las reglas globales de impresión (`.print-area` / `.no-print`). El PDF se
  obtiene con "Guardar como PDF" del diálogo de impresión del navegador; mientras se
  imprime, el título del documento pasa a `Presupuesto PRE-xxx - Apellido Nombre` para
  que ese sea el nombre sugerido del archivo.
- **Historial de cambios del viaje** (`appendTripEvent`) para trazabilidad de estados,
  reasignaciones y ediciones.
- **Fechas locales `YYYY-MM-DD`** (`utils/dates.js`) para evitar desfasajes por zona
  horaria de `toISOString()`.
- **Filtros en la URL** (`utils/urlState.js`), para que se conserven al navegar y con
  Atrás/Adelante.
- **Acceso seguro al almacenamiento** (`utils/storage.js`): si `localStorage` está
  bloqueado (modo privado), la app sigue funcionando en memoria.
- **Textos y estructura de pantallas** tomados de las referencias de Figma
  (`referencias-figma/`), con "Pacientes" reemplazado por "Pasajeros".

---

## 4. Limitaciones conocidas

- **Autenticación simulada.** Usuario `admin` / `admin123` validado en el navegador
  (`AuthProvider.jsx`). No es un mecanismo de seguridad real; las credenciales son
  ficticias y de demostración.
- **Sin backend ni base de datos.** Los datos quedan en el `localStorage` de cada
  navegador: no se comparten entre dispositivos ni usuarios y se pierden si se borran
  los datos del sitio.
- **Documentación de pasajeros simulada.** Solo se guardan los metadatos del archivo
  (nombre, tipo, tamaño, fecha); el contenido no se almacena.
- **Presupuestos:** tarifas e importes ficticios (no son valores reales ni actuales de
  Transporte Acosta). Son estimaciones: no hay facturación, cobros, aceptación del
  cliente ni vencimiento. El PDF depende del diálogo de impresión del navegador (no se
  genera un archivo sin intervención del usuario). No se emiten presupuestos a
  pasajeros inactivos. La eliminación es definitiva y no hay numeración fiscal (el
  identificador `PRE-xxx` es interno).
- **Gastos:** importes ficticios de demostración (no son tarifas reales ni actuales).
  No hay comprobantes adjuntos ni facturación. No se registran gastos sin viaje (por
  ejemplo, un service de un vehículo sin viajes) ni de viajes programados o cancelados.
  La eliminación es definitiva.
- **Un único rol de usuario.** Hay una sola cuenta simulada ("Administrador"), que
  cumple el papel de operador; no hay roles ni permisos diferenciados.
- **Duración de los viajes no modelada.** Los conflictos de chofer, vehículo o
  pasajero se detectan por coincidencia exacta de fecha y hora.
- **Datos por navegador y por dirección.** `localhost:5173` (dev) y `localhost:4173`
  (preview) tienen almacenamientos distintos.
- **Pruebas de navegador opcionales.** `npm run test:e2e` necesita Chrome o Edge
  instalado y Node.js 22+; las pruebas unitarias (`npm test`) no tienen requisitos extra.
- **Dependencia sin uso:** `font-awesome` figura en `package.json` pero no se importa
  (los íconos son de lucide-react). No se quitó para no cambiar dependencias sin
  autorización; puede eliminarse con `npm uninstall font-awesome`.
- **Tamaño del build:** con la carga diferida, el archivo inicial pasó de ~1.080 kB a
  ~403 kB (~126 kB gzip) y desapareció la advertencia de Vite. Recharts (~330 kB) se
  descarga solo al abrir el Panel o Gastos.

---

## 5. Tareas pendientes

### Etapa 5C
- [x] **5C.1 Gastos** (CU-13): registro de gastos operativos por viaje (según `referencias-figma/gastos.png` y `gastos2.png`). Datos v7.
- [x] **5C.2 Presupuestos** (CU-14): cálculo, historial, edición, eliminación, impresión/PDF e integración con la ficha del pasajero (según `referencias-figma/presupuestos.png`). Datos v8.

**Módulos funcionales: completados.**

### Etapa 6 — Auditoría final
- [x] Matriz y verificación de los 14 casos de uso (unitarias + navegador).
- [x] Recorrido de integración de punta a punta.
- [x] Quitar el código sin uso (`ModulePlaceholder`, `PENDING_MODULES`, `formatCurrency`, estilos de la vista provisional).
- [x] Carga diferida de pantallas (sin advertencia de tamaño del build).
- [x] Pruebas reproducibles en el repositorio (`tests/`).
- [x] README sin la plantilla de Vite, PROGRESO actualizado y GUIA_DEMO para la muestra.
- [x] Revisión visual contra Figma y responsive (375 px y 768 px sin desplazamiento horizontal).

### Mejoras opcionales (fuera del alcance de la demostración)
- [ ] Unificar en un solo módulo el intérprete de importes de `expenses.js` y `budgets.js` (hoy son equivalentes y están probados por separado).
- [ ] Quitar la dependencia sin uso `font-awesome`.
- [ ] Modelar la duración de los viajes para detectar superposiciones parciales.

---

## 6. Pruebas automatizadas

| Comando | Alcance | Resultado (Etapa 6) |
|---------|---------|---------------------|
| `npm test` | 57 pruebas unitarias (`tests/unit/`, `node:test`): validaciones, conflictos, vigencias, estados, turnos, asistencias, gastos, presupuestos, integridad de la semilla y migraciones v1→v8 | 57/57 |
| `npm run test:e2e` | 96 comprobaciones de navegador (`tests/e2e/`): integración completa, CU-03/05/06/07/11/12, todas las pantallas, 375/768 px, impresión, restauración y consola | 96/96 (dev y build de producción) |

Las pruebas de navegador usan un perfil temporal de Chrome/Edge que se borra al
terminar: no tocan los datos guardados en el navegador habitual.

---

## 7. Cómo ejecutar

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción en dist/
npm run preview    # sirve dist/ (plan B para la muestra)
npm run lint       # oxlint
npm test           # pruebas unitarias
npm run test:e2e   # pruebas de navegador (requiere Chrome o Edge)
```

Credenciales de demostración: `admin` / `admin123`. Guion de la muestra: [GUIA_DEMO.md](GUIA_DEMO.md).
