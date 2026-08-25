export function createDataRevision(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${serialized.length}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
