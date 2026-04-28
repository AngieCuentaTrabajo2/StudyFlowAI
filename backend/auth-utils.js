import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function crearHashContrasena(contrasena) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function esHashSeguroContrasena(valor) {
  return typeof valor === "string" && valor.startsWith("scrypt$");
}

export function verificarContrasena(contrasena, hashGuardado) {
  if (!esHashSeguroContrasena(hashGuardado)) {
    return false;
  }

  const [, salt, hashHex] = hashGuardado.split("$");
  const hashCalculado = scryptSync(contrasena, salt, 64);
  const hashOriginal = Buffer.from(hashHex, "hex");

  if (hashOriginal.length !== hashCalculado.length) {
    return false;
  }

  return timingSafeEqual(hashOriginal, hashCalculado);
}

export function obtenerNombreYApellidosGoogle(payload) {
  const nombreCompleto = String(payload?.name || "").trim();
  const nombres = String(payload?.given_name || "").trim();
  const apellidos = String(payload?.family_name || "").trim();

  if (nombres || apellidos) {
    return {
      nombres: nombres || nombreCompleto || "Estudiante",
      apellidos,
    };
  }

  const [primerNombre = "Estudiante", ...resto] = nombreCompleto.split(" ").filter(Boolean);
  return {
    nombres: primerNombre,
    apellidos: resto.join(" "),
  };
}

export function crearHashTemporalGoogle() {
  return crearHashContrasena(randomBytes(24).toString("hex"));
}

export function crearTokenSeguro(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function crearHashToken(valor) {
  return createHash("sha256").update(String(valor)).digest("hex");
}

function tieneTextoPerfilValido(valor) {
  return typeof valor === "string" && valor.trim() && valor.trim().toLowerCase() !== "por definir";
}

export function requiereCompletarPerfilAcademico(usuario) {
  return !(
    tieneTextoPerfilValido(usuario?.universidad) &&
    tieneTextoPerfilValido(usuario?.carrera) &&
    tieneTextoPerfilValido(usuario?.semestre)
  );
}
