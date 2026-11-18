# Progreso del proyecto — Sistema de Gestión de Traslados Programados

Proyecto académico (UTN). Aplicación web de una sola página (SPA) para administrar
pasajeros, viajes, asistencias, agenda de turnos, choferes y vehículos de un
servicio de traslados programados.

**Estado actual:** etapas 1 a 5B completas. Próxima: Etapa 5C (Gastos y Presupuestos).
**Rama de trabajo:** `develop` · **Última verificación:** `npm run build` y `npm run lint` sin errores.

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

Los módulos **Gastos** y **Presupuestos** aparecen en el menú con una vista provisional
(`ModulePlaceholder`), definida en `src/config/navigation.js`.

---

## 2. Arquitectura

### Stack
- **React 19** + **Vite 8** (build) + **React Router 7** (rutas).
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
├── constants/           Catálogos de estados, tipos y reglas (estados, agenda, recursos, pasajeros)
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
```

### Flujo de datos
1. `DataProvider` mantiene **un único estado global** con `useReducer`
   (colecciones: `pasajeros`, `viajes`, `asistencias`, `choferes`, `vehiculos`,
   `instituciones`, `presupuestos`, `turnos`, `notificacionesLeidas`).
2. Cada cambio se persiste en `localStorage` (clave `traslados-demo:datos`).
3. Las pantallas leen con `useData()` y modifican mediante `addItem`, `updateItem`,
   `updateMany` y `removeItem`. Las acciones con reglas de negocio están en los hooks
   `use*Actions`.
4. Indicadores, contadores, notificaciones y ocurrencias de la agenda **se calculan**
   en `utils/` a partir del estado; no se guardan copias.

### Rutas
`/login` (pública) y, dentro del layout protegido: `/dashboard`, `/pasajeros`,
`/viajes`, `/asistencias`, `/agenda`, `/choferes`, `/vehiculos`, cada una con
`/nuevo`, `/:id` y `/:id/editar` cuando corresponde. `/gastos` y `/presupuestos`
muestran la vista provisional. Cualquier otra ruta redirige a `/dashboard`.

---

## 3. Decisiones técnicas

- **Estado global único + persistencia local.** Un solo `DataProvider` garantiza que
  un cambio (p. ej., cancelar un viaje) se refleje en todas las pantallas. Se eligió
  `localStorage` porque el alcance académico no incluye backend.
- **Datos versionados con migraciones.** `DATA_VERSION` (hoy 6) se incrementa en cada
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
- **Presupuestos solo de lectura** en la ficha del pasajero; su gestión llega en la Etapa 5C.
- **Gastos y Presupuestos** sin implementar (vista provisional).
- **Bundle grande.** El build genera un único chunk JS de ~1 MB (~286 kB gzip) y Vite
  emite la advertencia de tamaño (> 500 kB). No afecta el funcionamiento; se puede
  resolver con carga diferida de rutas (`React.lazy`).
- **Sin pruebas automatizadas.** La verificación es manual, más build y lint.
- **Un único rol de usuario** (administrador); no hay permisos diferenciados.
- `README.md` todavía contiene el texto de la plantilla de Vite.

---

## 5. Tareas pendientes

### Etapa 5C (próxima)
- [ ] Módulo **Gastos**: registro de gastos operativos de la flota (según `referencias-figma/gastos.png` y `gastos2.png`).
- [ ] Módulo **Presupuestos**: historial y emisión de presupuestos de traslados (según `referencias-figma/presupuestos.png`), integrado con los presupuestos ya existentes en los datos.
- [ ] Incrementar `DATA_VERSION` y agregar la migración correspondiente sin perder datos.
- [ ] Marcar ambos módulos como `implemented: true` en `navigation.js`.

### Mejoras posteriores
- [ ] Reemplazar el `README.md` de plantilla por la documentación del proyecto.
- [ ] Code splitting por rutas para reducir el tamaño del bundle.
- [ ] Pruebas unitarias de las reglas de negocio en `utils/`.
- [ ] Revisión general de accesibilidad y diseño responsive.

---

## 6. Cómo ejecutar

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run lint     # oxlint
```

Credenciales de demostración: `admin` / `admin123`.
