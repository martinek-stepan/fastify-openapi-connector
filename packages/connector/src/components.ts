import type { FastifyInstance } from 'fastify';
import type { Components } from './types.js';

export const removeXtensions = (obj: unknown) => {
  if (typeof obj !== 'object' || obj == null) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      removeXtensions(item);
    }
  } else if (typeof obj === 'object' && obj != null) {
    for (const key of Object.getOwnPropertyNames(obj)) {
      const record = obj as Record<string, unknown>;
      if (key.startsWith('x-')) {
        delete record[key];
      } else {
        removeXtensions(record[key]);
      }
    }
  }
};

export const registerComponents = (fastify: FastifyInstance, components?: Components) => {
  if (!components?.schemas) {
    return;
  }

  for (const [key, value] of Object.entries(components.schemas)) {
    const filteredValue = structuredClone(value);
    removeXtensions(filteredValue);

    fastify.addSchema({
      $id: `#/components/schemas/${key}`,
      //$schema: "https://json-schema.org/draft/2020-12/schema",
      ...filteredValue,
    });
  }
};
