/**
 * Validation des charges utiles entrantes.
 */
export class ValidationError extends Error {
  status = 400;
}

export function requireString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`champ manquant ou vide : ${field}`);
  }
  return value;
}

// ISO 8601 en UTC (suffixe Z), secondes et millisecondes facultatives.
const ISO_UTC = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

export function requireDate(payload: Record<string, unknown>, field: string): string {
  const value = requireString(payload, field);
  const match = ISO_UTC.exec(value);
  const time = Date.parse(value);
  // Le dernier test ecarte les dates impossibles que Date.parse decale (30 fevrier -> 2 mars).
  if (!match || Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== match[1]) {
    throw new ValidationError(`date invalide : ${field}`);
  }
  return value;
}

export function requirePositiveInt(payload: Record<string, unknown>, field: string): number {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`entier positif attendu : ${field}`);
  }
  return value;
}
