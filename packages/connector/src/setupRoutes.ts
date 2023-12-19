import { FastifyInstance, HTTPMethods } from 'fastify';
import { createSecurityProcessors } from './createSecurityProcessors.js';
import { defaultHandler } from './defaultOperationHandler.js';
import { parseParams } from './parseParams.js';
import { createRouteSchema } from './routeSchema.js';
import {
  OperationHandlersUntyped,
  Paths,
  PathsMap,
  ReferenceObject,
  SecurityHandlers,
  SecuritySpecification,
  SpecResponse,
} from './types.js';

// TypeGuard to check extension x-security object fulfills the SecurityObject specification
export const validateSecurityObject = (security: unknown): security is SecuritySpecification => {
  if (typeof security !== 'object' || !Array.isArray(security)) {
    return false;
  }

  for (const item of security) {
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (typeof key !== 'string' || !Array.isArray(value) || !value.every((scope) => typeof scope === 'string')) {
        return false;
      }
    }
  }

  return true;
};

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
    operationHandlers: OperationHandlersUntyped;
    paths: PathsMap;
    globalSecurity?: SecuritySpecification;
    securityHandlers?: SecurityHandlers;
  },
  settings: {
    isWebhook: boolean;
    useXSecurity?: boolean;
  },
) => {
  for (const [path, pathObject] of Object.entries(routesInfo.paths)) {
    let url = path;
    if (settings.isWebhook) {
      if ('$ref' in (pathObject as ReferenceObject | Paths)) {
        fastify.log.error(`Webhook path ${path} is a reference, references need to be resolved for the plugin to work!`);
        continue;
      }

      if (!path.startsWith('/')) {
        fastify.log.warn(`Webhook path ${path} does not start with a slash, slash will be added.`);
        url = `/${url}`;
      }
    }

    const { parameters, 'x-security': xSecurity, ...methods } = pathObject as Paths;

    let routeSecurity: SecuritySpecification | undefined = undefined;
    if (settings.useXSecurity === true && xSecurity) {
      if (validateSecurityObject(xSecurity)) {
        routeSecurity = xSecurity;
      } else {
        fastify.log.warn(`${path} - x-security is not a valid SecurityObject! Will not be used.`);
      }
    }
    const params = parseParams(parameters ?? []);

    for (const [method, operation] of Object.entries(methods)) {
      // Skip extensions
      if (method.startsWith('x-')) {
        continue;
      }

      const { parameters, operationId, requestBody, security: operationSecurity, responses, ...operationValues } = operation;

      if (!operationId) {
        fastify.log.error(`${path} - ${method} is missing operationId! Will be skipped.`);
        continue;
      }

      let handler = routesInfo.operationHandlers[operationId];
      if (!handler) {
        fastify.log.warn(`${path} - ${method} has no handler! Will use default handler.`);
        handler = defaultHandler;
      }
      // Overrides any path params already defined
      const operationParams = parseParams(parameters ?? [], structuredClone(params));

      fastify.route({
        method: method.toUpperCase() as HTTPMethods,
        // fastify wants 'path/:param' instead of openapis 'path/{param}'
        url: url.replace(/{(\w+)}/g, ':$1'),
        handler,
        config: operationValues['x-fastify-config'],
        schema: createRouteSchema(operationParams, requestBody, fixEmptyResponses(responses)),
        // Operation security overrides global security
        preParsing: createSecurityProcessors(
          routesInfo.securityHandlers ?? {},
          operationSecurity ?? routeSecurity ?? routesInfo.globalSecurity,
        ),
      });
    }
  }
};
