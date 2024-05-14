import type { FastifySchema } from 'fastify';
import type { ParsedParameter, SchemaParametersIn, SpecResponse } from './types.js';

/**
 * Helper function to create route schema from the OpenAPI specification
 * @param params OAS parameters object
 * @param requestBody OAS requestBody object
 * @param responses OAS responses object
 * @returns Fastify schema object
 */
export const createRouteSchema = (
  params: Record<SchemaParametersIn, ParsedParameter | undefined>,
  requestBody?: unknown,
  responses?: SpecResponse,
  validateResponse?: boolean,
): FastifySchema => {
  // https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/#validation-and-serialization
  // We only do schema for application/json as that is only one supported for parsing by fastify anyway
  // biome-ignore lint/suspicious/noExplicitAny: There is definition of requestBody, but for our purpuses using dynamic typing is completly fine as we treat everything as optional
  const bodySchema = (requestBody as any)?.content?.['application/json']?.schema;

  // Fastify have stupid validation where if we add the property as undefine it will show warning
  const schema: FastifySchema = {};

  if (bodySchema) {
    schema.body = bodySchema;
  }

  if (params.query) {
    schema.querystring = params.query;
  }

  if (params.path) {
    schema.params = params.path;
  }

  if (params.header) {
    schema.headers = params.header;
  }

  if (validateResponse === true && responses) {
    schema.response = responses;
  }

  return schema;
};
