import { ParsedParameter, SchemaParameter, SchemaParametersIn } from './types.js';

export const parseParams = (
  data: SchemaParameter[],
  params: Record<SchemaParametersIn, ParsedParameter | undefined> = {
    query: undefined,
    path: undefined,
    header: undefined,
    cookie: undefined,
  },
): Record<SchemaParametersIn, ParsedParameter | undefined> => {
  for (const item of data) {
    if (item.in === 'cookie') {
      console.warn('cookie parameters are not supported in fastify, will be ignored...');
      continue;
    }

    const param: ParsedParameter = params[item.in] ?? {
      type: 'object',
      properties: {},
    };

    param.properties[item.name] = {
      ...item.schema,
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
