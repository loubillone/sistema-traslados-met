// Búsqueda global del encabezado: recorre pasajeros, choferes, vehículos y destinos.

import { fullName } from "./selectors";

const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const MAX_PER_GROUP = 5;

export function searchAll(data, term) {
  const query = normalize(term);
  if (query.length < 2) return [];

  const matches = (...fields) => fields.some((field) => normalize(field).includes(query));
  const institucionNombre = Object.fromEntries(data.instituciones.map((i) => [i.id, i.nombre]));

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
      group: "Viajes por destino",
      items: data.instituciones
        .filter((i) => matches(i.nombre, i.nombreCorto, i.direccion))
        .map((i) => ({
          id: i.id,
          label: i.nombre,
          detail: `${data.viajes.filter((v) => v.institucionId === i.id && v.estado === "programado").length} viajes programados`,
          path: "/viajes",
        })),
    },
    {
      group: "Choferes",
      items: data.choferes
        .filter((c) => matches(fullName(c), c.dni, c.licencia))
        .map((c) => ({ id: c.id, label: fullName(c), detail: `Licencia ${c.licencia}`, path: "/choferes" })),
    },
    {
      group: "Vehículos",
      items: data.vehiculos
        .filter((v) => matches(v.patente, v.tipo, v.modelo))
        .map((v) => ({ id: v.id, label: v.patente, detail: `${v.tipo} · ${v.capacidad} personas`, path: "/vehiculos" })),
    },
  ];

  return groups
    .map((g) => ({ ...g, items: g.items.slice(0, MAX_PER_GROUP) }))
    .filter((g) => g.items.length > 0);
}
