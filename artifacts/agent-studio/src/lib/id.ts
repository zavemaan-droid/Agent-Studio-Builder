export function newId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 11);
}
