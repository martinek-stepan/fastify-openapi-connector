/**
 * Helper function, recursively removes all x-extension properties from a schema object.
 * @param obj - Schema object to process
 * @returns A new object with all x-extension properties removed
 */
export const removeXtensions = <T>(obj: T): T => {
  if (typeof obj !== 'object' || obj == null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeXtensions) as T;
  }

  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('x-'))
      .map(([key, value]) => [key, removeXtensions(value)])
  ) as T;
};

