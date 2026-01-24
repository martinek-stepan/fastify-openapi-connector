import type { FastifySchema } from 'fastify';
import { removeXtensions } from './removeXtensions.js';
import type { ParsedParameter, SchemaParametersIn, SpecResponse } from './types.js';

/**
 * Helper function to create route schema from the OpenAPI specification
 * @param params OAS parameters object
 * @param contentTypes Priority list of content types we try to set for validation of bodySchema
 * @param requestBody OAS requestBody object
 * @param responses OAS responses object
 * @returns Fastify schema object
 */
export const createRouteSchema = (
  params: Record<SchemaParametersIn, ParsedParameter | undefined>,
  contentTypes: string[],
  requestBody?: unknown,
  responses?: SpecResponse,
  validateResponse?: boolean,
): FastifySchema => {
  let bodySchema;
  // https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/#validation-and-serialization
  // By default we set 'application/json', but can be overriden by user. For example 'application/scim+json' might be needed.
  for (const contentType of contentTypes) {
    // biome-ignore lint/suspicious/noExplicitAny: We not sure what we have
    bodySchema ??= (requestBody as any)?.content?.[contentType]?.schema;
  }

  // Fastify have stupid validation where if we add the property as undefine it will show warning
  const schema: FastifySchema = {};

  if (bodySchema) {
    schema.body = removeXtensions(bodySchema);
  }

  if (params.query) {
    schema.querystring = removeXtensions(params.query);
  }

  if (params.path) {
    schema.params = removeXtensions(params.path);
  }

  if (params.header) {
    schema.headers = removeXtensions(params.header);
  }

  if (validateResponse === true && responses) {
    schema.response = removeXtensions(responses);
  }

  return schema;
};
