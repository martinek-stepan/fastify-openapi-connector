import { FastifyInstance, HTTPMethods } from 'fastify';
import { createSecurityProcessors } from './createSecurityProcessors.js';
import { defaultHandler } from './defaultOperationHandler.js';
import { parseParams } from './parseParams.js';
import { createRouteSchema } from './routeSchema.js';
import { OperationHandlers, Paths, PathsMap, ReferenceObject, SecurityHandlers, SecuritySpecification, SpecResponse } from './types.js';

export const fixEmptyResponses = (responses?: SpecResponse): SpecResponse | undefined => {
  if (!responses) {
    return undefined;
  }

  const copy = structuredClone(responses);

  for (const response of Object.values(copy)) {
    if (!response.content) {
      response.type = 'null';
    }
  }

  return copy;
};

export const setupRoutes = (
  fastify: FastifyInstance,
  routesInfo: {
    operationHandlers: OperationHandlers;
    paths: PathsMap;
    globalSecurity?: SecuritySpecification;
    securityHandlers?: SecurityHandlers;
  },
  isWebhook: boolean,
) => {
  for (const [path, pathObject] of Object.entries(routesInfo.paths)) {
    let url = path;
    if (isWebhook) {
      if ('$ref' in (pathObject as ReferenceObject | Paths)) {
        fastify.log.error(`Webhook path ${path} is a reference, references need to be resolved for the plugin to work!`);
        continue;
      }

      if (!path.startsWith('/')) {
        fastify.log.warn(`Webhook path ${path} does not start with a slash, slash will be added.`);
        url = `/${url}`;
      }
    }

    const { parameters, ...methods } = pathObject as Paths;

    const params = parseParams(parameters ?? []);

    for (const [method, operation] of Object.entries(methods)) {
      const { parameters, operationId, requestBody, security, responses, ...operationValues } = operation;

      if (!operationId) {
        fastify.log.error(`${path} - ${method} is missing operationId! Will be skipped.`);
        continue;
      }

      // Overrides any path params already defined
      const operationParams = parseParams(parameters ?? [], structuredClone(params));

      fastify.route({
        method: method.toUpperCase() as HTTPMethods,
        // fastify wants 'path/:param' instead of openapis 'path/{param}'
        url: url.replace(/{(\w+)}/g, ':$1'),
        handler: routesInfo.operationHandlers[operationId] ?? defaultHandler,
        config: operationValues['x-fastify-config'],
        schema: createRouteSchema(operationParams, requestBody, fixEmptyResponses(responses)),
        // Operation security overrides global security
        preParsing: createSecurityProcessors(routesInfo.securityHandlers ?? {}, security ?? routesInfo.globalSecurity),
      });
    }
  }
};
