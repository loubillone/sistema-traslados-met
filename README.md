# Sistema de Gestión de Traslados Programados

Aplicación web para organizar los **traslados programados de pasajeros** de
**Transporte Acosta** (pasajeros, viajes, asistencias, turnos recurrentes,
choferes, vehículos, gastos y presupuestos).

> ⚠️ **Demostración académica, no es un sistema de producción.**
> Se desarrolló para la muestra académica de la **UTN – Facultad Regional Tucumán**.
> Todos los datos son ficticios, el inicio de sesión es simulado y la información
> se guarda únicamente en el navegador. No hay backend, base de datos, facturación,
> cobros ni autenticación real.

---

## Objetivo

Mostrar, con una interfaz basada en las pantallas de Figma del proyecto, cómo un
sistema podría resolver los 14 casos de uso definidos para la gestión de traslados.
Desde registrar un pasajero hasta calcular un presupuesto, los datos se mantienen
coherentes entre todas las pantallas.

## Tecnologías

| Uso | Tecnología |
|-----|------------|
| Interfaz | React 19 + JavaScript |
| Compilación y servidor de desarrollo | Vite 8 |
| Rutas | React Router 7 (pantallas con carga diferida) |
| Estado global | Context API (`AuthProvider`, `DataProvider`) |
| Persistencia | `localStorage` del navegador |
| Estilos | Bootstrap 5 + CSS propio, tipografía Inter |
| Íconos, gráficos y diálogos | lucide-react, Recharts, SweetAlert2 |
| Calidad | oxlint (lint), `node:test` (pruebas unitarias), pruebas de navegador propias |

## Módulos y casos de uso

| Módulo | Ruta | Casos de uso |
|--------|------|--------------|
| Panel Principal | `/dashboard` | Indicadores del día y gráficos mensuales |
| Pasajeros | `/pasajeros` | CU-01 Buscar por DNI · CU-02 Registrar · CU-03 Actualizar ficha y documentación |
| Viajes | `/viajes` | CU-04 Registrar viaje · CU-05 Historial · CU-06 Reasignar chofer · CU-07 Cancelar |
| Asistencias | `/asistencias` | CU-08 Registrar asistencia · CU-09 Generar planilla |
| Agenda de Turnos | `/agenda` | CU-10 Registrar turno recurrente |
| Choferes | `/choferes` | CU-11 Registrar chofer |
| Vehículos | `/vehiculos` | CU-12 Registrar vehículo |
| Gastos | `/gastos` | CU-13 Registrar gasto por viaje |
| Presupuestos | `/presupuestos` | CU-14 Calcular presupuesto (con impresión y PDF) |

## Credenciales ficticias

| Usuario | Contraseña |
|---------|------------|
| `admin` | `admin123` |

Hay una única cuenta simulada (se muestra como "Administrador"). Las credenciales se
validan en el navegador: **no es un mecanismo de seguridad**.

## Instalación y ejecución

Requisitos: **Node.js 22 o superior** (Vite 8 admite desde 20.19, pero las pruebas
de navegador usan el WebSocket nativo de Node 22) y un navegador actualizado.

```bash
npm install      # instala las dependencias
npm run dev      # inicia el servidor de desarrollo
```

Abrir la dirección que muestra la consola (normalmente <http://localhost:5173>) e
ingresar con `admin` / `admin123`.

Otros comandos:

| Comando | Qué hace |
|---------|----------|
| `npm run build` | Genera la versión optimizada en `dist/` |
| `npm run preview` | Sirve la carpeta `dist/` (útil como plan B en la muestra) |
| `npm run lint` | Revisa el código con oxlint |
| `npm test` | Pruebas unitarias de las reglas del sistema (57 pruebas, sin dependencias extra) |
| `npm run test:e2e` | Pruebas de navegador (recorrido completo de los 14 casos de uso) |

### Pruebas

- **Unitarias** (`tests/unit/`): validaciones de pasajeros, choferes y vehículos,
  conflictos de asignación, vigencia de documentación, estados de los viajes, turnos
  duplicados, asistencias, cálculo de gastos y presupuestos, integridad de los datos
  de demostración y migraciones de `localStorage` (v1 → v8). Usan la semilla
  generada para una fecha fija, así que dan el mismo resultado cualquier día.
- **De navegador** (`tests/e2e/`): levantan su propio servidor de Vite y abren
  Chrome o Edge en modo headless con un **perfil temporal que se borra al terminar**.
  Nunca leen ni modifican los datos de su navegador habitual. Recorren el flujo
  completo (pasajero → turno → viaje → asistencia → planilla → gasto → presupuesto →
  panel), los demás casos de uso, todas las pantallas en escritorio y en pantallas
  chicas, la vista de impresión y la restauración de datos.
  - Si el navegador no está en una ruta habitual: `CHROME_PATH="ruta/al/chrome"`.
  - Para probar el build de producción: `npm run build`, luego `npm run preview` y,
    en otra terminal, `E2E_BASE_URL=http://localhost:4173 npm run test:e2e`.
  - Para guardar capturas: `E2E_SCREENSHOTS=carpeta npm run test:e2e`.

## Cómo se guardan los datos (localStorage)

- Todos los datos viven en el `localStorage` del navegador, en la clave
  `traslados-demo:datos`. Cada cambio se guarda en el momento y se conserva al
  recargar la página o cerrar el navegador.
- La sesión usa `traslados-demo:sesion` (en `localStorage` con "Recordarme" o en
  `sessionStorage` sin esa opción). Además se guardan `traslados-demo:usuario-recordado`
  y `traslados-demo:menu-contraido`.
- Los datos tienen una **versión** (hoy 8). Si el navegador tiene datos de una versión
  anterior, se **migran** automáticamente sin perder los registros cargados
  (`src/data/migrations.js`).
- Los datos de demostración se calculan a partir de la fecha actual: siempre hay
  viajes de hoy, historial de los últimos meses y viajes próximos.
- Cada navegador (y cada perfil) tiene sus propios datos: no se comparten entre
  equipos ni usuarios.

## Restaurar los datos de demostración

1. Abrir el menú de usuario (arriba a la derecha, "Administrador").
2. Elegir **Restaurar datos de demostración** y confirmar.

Se descartan **todos** los cambios hechos en ese navegador y se vuelven a cargar los
datos ficticios con las fechas del día. Si la aplicación no llegara a abrir,
también se pueden borrar los datos del sitio desde las herramientas del navegador
(Aplicación → Almacenamiento → Borrar datos del sitio).

## Estructura

```
src/
├── App.jsx          Rutas (cada pantalla se carga al abrirla)
├── config/          Menú lateral
├── constants/       Catálogos y parámetros (estados, categorías, límites)
├── context/         AuthProvider (sesión simulada) y DataProvider (estado global)
├── data/            Datos de demostración y migraciones
├── hooks/           Acciones con reglas de negocio (viajes, recursos, gastos, presupuestos...)
├── utils/           Reglas de negocio puras (validaciones, cálculos, filtros)
├── components/      Componentes comunes, de layout y de cada módulo
├── pages/           Pantallas por módulo (listado, detalle, formulario)
└── styles/          Estilos globales y por módulo
tests/
├── unit/            Pruebas unitarias (node:test)
├── e2e/             Pruebas de navegador
└── support/         Utilidades de las pruebas
```

Documentación adicional: [PROGRESO.md](PROGRESO.md) (etapas, decisiones técnicas y
limitaciones) y [GUIA_DEMO.md](GUIA_DEMO.md) (guion para la muestra).

## Limitaciones de la demostración

- Inicio de sesión simulado, con una sola cuenta y sin roles diferenciados.
- Sin backend ni base de datos: los datos quedan en cada navegador y se pierden si
  se borran los datos del sitio.
- Documentación de pasajeros simulada: solo se guardan nombre, tipo, tamaño y fecha
  del archivo, no su contenido.
- Importes de gastos y tarifas de presupuestos ficticios: no son valores reales ni
  actuales de Transporte Acosta. No hay facturación, cobros ni comprobantes fiscales.
- El PDF de los presupuestos se obtiene con "Guardar como PDF" del diálogo de
  impresión del navegador.
- La duración de los viajes no se modela: los conflictos de chofer, vehículo o
  pasajero se detectan por coincidencia exacta de fecha y hora.
- Gastos y presupuestos se eliminan en forma definitiva. Pasajeros, choferes,
  vehículos y turnos solo se desactivan, así que su historial se conserva.
