import { ParsedParameter, SchemaParameter, SchemaParametersIn } from "./types.js";

export const parseParams = (data: SchemaParameter[], params: Record<SchemaParametersIn, ParsedParameter | undefined> = {
  query: undefined,
  path: undefined,
  header: undefined,
  cookie: undefined
}): Record<SchemaParametersIn, ParsedParameter | undefined> =>  {
 

  for (const item of data) {
    if (item['in'] === 'cookie') {
      console.warn('cookie parameters are not supported in fastify, will be ignored...');
      continue;
    }

    if (!params[item['in']]) {
      params[item['in']] = {
        type: 'object',
        properties: {}
      };
    }


    params[item['in']]!.properties[item.name] = {
      type: item.schema.type,
      description: item.description
    }
    
    if (item.required) {
      params[item['in']]?.required?.push(item.name) ?? (params[item['in']]!.required = [item.name]);
    }
  }

  return params;
}

