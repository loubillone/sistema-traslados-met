// Hook de resolución para las pruebas en Node: el código de la app importa
// módulos sin extensión ("../utils/dates"), como permite Vite. Node exige la
// extensión, así que se reintenta agregando ".js".
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (error.code === "ERR_MODULE_NOT_FOUND" && relative && !/\.[cm]?js$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}
