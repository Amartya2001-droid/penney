/** Collision-resistant enough for a local, single-device prototype. */
export function generateId(prefix = 'id'): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${random}`;
}
