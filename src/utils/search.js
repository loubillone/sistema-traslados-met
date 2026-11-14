// Búsqueda global del encabezado: recorre pasajeros, viajes, choferes, vehículos y destinos.

import { ESTADOS_VIAJE } from "../constants/estados";
import { formatDate, todayISO } from "./dates";
import { fullName } from "./selectors";

const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const MAX_PER_GROUP = 5;

export function searchAll(data, term, today = todayISO()) {
  const query = normalize(term);
  if (query.length < 2) return [];

  const matches = (...fields) => fields.some((field) => normalize(field).includes(query));
  const institucionNombre = Object.fromEntries(data.instituciones.map((i) => [i.id, i.nombre]));
  const pasajeroNombre = Object.fromEntries(data.pasajeros.map((p) => [p.id, fullName(p)]));
  const proximos = (field, id) =>
    data.viajes.filter((v) => v[field] === id && v.estado === "programado" && v.fecha >= today).length;

  // Los viajes se buscan por su código (ej.: "VIA-01060" o "via-106"), para no
  // mezclar números de viaje con búsquedas por DNI.
  const viajeQuery = query.startsWith("via") ? query.replace(/^via-?0*/, "") : null;

  const groups = [
    {
      group: "Pasajeros",
      items: data.pasajeros
        .filter((p) => matches(fullName(p), p.dni, p.obraSocial))
        .map((p) => ({
          id: p.id,
          label: fullName(p),
          detail: `DNI ${p.dni}${p.activo ? "" : " · Inactivo"}${
            institucionNombre[p.institucionId] ? ` · ${institucionNombre[p.institucionId]}` : ""
          }`,
          // Abre directamente la ficha del pasajero.
          path: `/pasajeros/${p.id}`,
          direct: true,
        })),
    },
    {
      group: "Viajes",
      items:
        viajeQuery === null
          ? []
          : data.viajes
              .filter((v) => String(Number(v.id.split("-").pop())).startsWith(viajeQuery) || normalize(v.id) === query)
              .map((v) => ({
                id: v.id,
                label: `${v.id} · ${formatDate(v.fecha)} ${v.hora}`,
                detail: `${pasajeroNombre[v.pasajeroId] ?? "—"} · ${ESTADOS_VIAJE[v.estado]?.label ?? v.estado}`,
                path: `/viajes/${v.id}`,
                direct: true,
              })),
    },
    {
      group: "Viajes por destino",
      items: data.instituciones
        .filter((i) => matches(i.nombre, i.nombreCorto, i.direccion))
        .map((i) => ({
          id: i.id,
          label: i.nombre,
          detail: `${proximos("institucionId", i.id)} viajes programados próximos`,
          path: `/viajes?destino=${i.id}`,
          direct: true,
        })),
    },
    {
      group: "Choferes",
      items: data.choferes
        .filter((c) => matches(fullName(c), c.dni, c.licencia))
        .map((c) => ({
          id: c.id,
          label: fullName(c),
          detail: `DNI ${c.dni}${c.activo ? "" : " · Inactivo"} · ${proximos("choferId", c.id)} viajes próximos`,
          // Abre la ficha del chofer (Etapa 5A), con sus viajes asignados.
          path: `/choferes/${c.id}`,
          direct: true,
        })),
    },
    {
      group: "Vehículos",
      items: data.vehiculos
        .filter((v) => matches(v.patente, v.tipo, v.modelo))
        .map((v) => ({
          id: v.id,
          label: v.patente,
          detail: `${v.tipo} · ${v.capacidad} personas${v.activo === false ? " · De baja" : ""} · ${proximos("vehiculoId", v.id)} viajes próximos`,
          path: `/vehiculos/${v.id}`,
          direct: true,
        })),
    },
  ];

  return groups
    .map((g) => ({ ...g, items: g.items.slice(0, MAX_PER_GROUP) }))
    .filter((g) => g.items.length > 0);
}
