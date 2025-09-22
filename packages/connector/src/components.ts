import type { FastifyInstance } from 'fastify';
import type { Components } from './types.js';

/**
 * Helper function to remove x-extensions from the schema
 * @param obj Schema object
 * @returns object without x-extensions
 */
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

/**
 * Helper function to remove x-extensions from the schema
 * @param obj Schema object
 * @returns object where if $ref starts with #/ that prefix is removed
 */
export const removeRefPrefix = (obj: unknown) => {
  if (typeof obj !== 'object' || obj == null) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      removeRefPrefix(item);
    }
  } else if (typeof obj === 'object' && obj != null) {
    for (const key of Object.getOwnPropertyNames(obj)) {
      const record = obj as Record<string, unknown>;
      if (key === '$ref' && typeof record[key] === 'string' && record[key].startsWith('#/')) {
        record[key] = record[key].substring(2);
      } else {
        removeRefPrefix(record[key]);
      }
    }
  }
};

/**
 * Function registering components (schema) to the fastify instance
 * @param fastify Fastify instance
 * @param components Components object from the OpenAPI specification
 */
export const registerComponents = (fastify: FastifyInstance, components?: Components): void => {
  if (!components?.schemas) {
    return;
  }

  for (const [key, value] of Object.entries(components.schemas)) {
    const filteredValue = structuredClone(value);
    removeXtensions(filteredValue);
    removeRefPrefix(filteredValue);

    fastify.addSchema({
      // For some reason fastify can not deal with #/ prefix in response validation
      $id: `components/schemas/${key}`,
      //$schema: "https://json-schema.org/draft/2020-12/schema",
      ...filteredValue,
    });
  }
};
