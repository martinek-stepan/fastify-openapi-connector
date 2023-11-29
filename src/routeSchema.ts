import { FastifySchema } from "fastify";
import { ParsedParameter, SchemaParametersIn } from "./types.js";



export const createRouteSchema = (params: Record<SchemaParametersIn, ParsedParameter | undefined>, requestBody?: any): FastifySchema => 
{
  // https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/#validation-and-serialization
  // We only do schema for application/json as that is only one supported for parsing by fastify anyway
  const bodySchema = requestBody?.content?.['application/json']?.schema;

  // Fastify have stupid validation where if we add the property as undefine it will show warning
  var schema: FastifySchema = {        
  };

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

  return schema;
}
