// Estado global único de la aplicación, persistido en localStorage.
// Todas las pantallas leen y modifican los datos desde aquí, de modo que
// un cambio (por ejemplo, cancelar un viaje) se refleja en todo el sistema.

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { DataContext } from "./contexts";
import { createSeedData, DATA_VERSION, ID_PREFIXES } from "../data/mockData";
import { readJSON, writeJSON } from "../utils/storage";

const STORAGE_KEY = "traslados-demo:datos";

/** Carga el estado guardado; los datos iniciales solo se generan si no existe uno válido. */
function loadInitialState() {
  const stored = readJSON(STORAGE_KEY);
  if (stored?.version === DATA_VERSION && Array.isArray(stored.viajes)) return stored;
  return createSeedData();
}

function nextId(collection, list) {
  const { prefix, digits } = ID_PREFIXES[collection];
  const max = list.reduce((acc, item) => {
    const number = Number(String(item.id).split("-").pop());
    return Number.isFinite(number) ? Math.max(acc, number) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(digits, "0")}`;
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const list = state[action.collection];
      const item = { ...action.item, id: action.item.id ?? nextId(action.collection, list) };
      return { ...state, [action.collection]: [...list, item] };
    }
    case "update":
      return {
        ...state,
        [action.collection]: state[action.collection].map((item) =>
          item.id === action.id ? { ...item, ...action.changes } : item,
        ),
      };
    case "remove":
      return {
        ...state,
        [action.collection]: state[action.collection].filter((item) => item.id !== action.id),
      };
    case "markNotificationsRead":
      return {
        ...state,
        notificacionesLeidas: Array.from(new Set([...state.notificacionesLeidas, ...action.ids])),
      };
    case "reset":
      return action.payload;
    default:
      return state;
  }
}

export default function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    writeJSON(STORAGE_KEY, state);
  }, [state]);

  const addItem = useCallback((collection, item) => dispatch({ type: "add", collection, item }), []);
  const updateItem = useCallback(
    (collection, id, changes) => dispatch({ type: "update", collection, id, changes }),
    [],
  );
  const removeItem = useCallback((collection, id) => dispatch({ type: "remove", collection, id }), []);
  const markNotificationsRead = useCallback((ids) => dispatch({ type: "markNotificationsRead", ids }), []);
  const resetDemoData = useCallback(() => dispatch({ type: "reset", payload: createSeedData() }), []);

  const value = useMemo(
    () => ({ data: state, addItem, updateItem, removeItem, markNotificationsRead, resetDemoData }),
    [state, addItem, updateItem, removeItem, markNotificationsRead, resetDemoData],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
