import { removeXtensions } from './components.js';
import type { ParsedParameter, ReferenceObject, SchemaParameter, SchemaParametersIn } from './types.js';

const schemaParamPrefixLength = '#/components/parameters/'.length;

/**
 * Helper function to parse parameters from the OpenAPI specification
 * @param data OAS parameters object
 * @param params Existing parameters to extend
 * @returns Parameters parameters object
 */
export const parseParams = (
  data: (SchemaParameter | ReferenceObject)[],
  schemaParameters: Record<string, SchemaParameter>,
  params: Record<SchemaParametersIn, ParsedParameter | undefined> = {
    query: undefined,
    path: undefined,
    header: undefined,
    cookie: undefined,
  },
): Record<SchemaParametersIn, ParsedParameter | undefined> => {
  for (let item of data) {
    if ('$ref' in item) { // resolve $ref
      item = schemaParameters[item.$ref.substring(schemaParamPrefixLength)];
    }
    if (item.in === 'cookie') {
      console.warn('cookie parameters are not supported in fastify, will be ignored...');
      continue;
    }

    const param: ParsedParameter = params[item.in] ?? {
      type: 'object',
      properties: {},
    };

    const filteredSchema = structuredClone(item.schema);
    removeXtensions(filteredSchema);

    param.properties[item.name] = {
      ...filteredSchema,
      description: item.description,
    };

    if (item.required) {
      if (!param.required) {
        param.required = [item.name];
      } else {
        param.required.push(item.name);
      }
    }

    params[item.in] = param;
  }

  return params;
};
