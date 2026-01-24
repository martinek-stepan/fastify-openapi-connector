/**
 * Recursively resolves all $ref pointers in a a schema object.
 * @param schema - Schema object containing $ref pointers to resolve
 * @returns A new object with all $ref pointers replaced by their referenced values
 * @throws Error if a reference path is invalid or not found
 */

function resolveRefs<T>(schema: T): T {
  const resolveRef = (refPath: string): unknown => {
    const parts = refPath.replace(/^#\//, '').split('/');
    let current: unknown = schema;

    for (const part of parts) {
      if (current === null || typeof current !== 'object' || Array.isArray(current)) {
        throw new Error(`Invalid reference path: ${refPath}`);
      }
      if (!(part in current)) {
        throw new Error(`Reference not found: ${refPath}`);
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  };

  const resolve = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(resolve);
    }

    const record = obj as Record<string, unknown>;

    if ('$ref' in record && typeof record['$ref'] === 'string') {
      return resolve(resolveRef(record['$ref']));
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, resolve(value)])
    );
  };

  return resolve(schema) as T;
}

export { resolveRefs };