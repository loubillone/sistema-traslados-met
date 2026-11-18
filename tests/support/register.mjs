// Se carga con `node --import` antes de las pruebas (ver script "test" en package.json).
import { register } from "node:module";

register("./resolve-extensionless.mjs", import.meta.url);
