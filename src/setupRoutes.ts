import fastify, { FastifyInstance, HTTPMethods } from "fastify";
import { parseParams } from "./parseParams.js";
import { OperationHandlers, Paths, PathsMap, ReferenceObject, SecurityHandlers, SecuritySpecification } from "./types.js";
import { defaultHandler } from "./defaultOperationHandler.js";
import { createRouteSchema } from "./routeSchema.js";
import { createSecurityProcessors } from "./createSecurityProcessors.js";


export const setupRoutes = (
  fastify: FastifyInstance,
  routesInfo: {
    operationHandlers: OperationHandlers;
    paths: PathsMap;
    globalSecurity?: SecuritySpecification;
    securityHandlers?: SecurityHandlers;
  },
  isWebhook: boolean
) => {
  
  
  for (const [path, pathObject] of Object.entries(routesInfo.paths)) {

    var url = path;
    if (isWebhook ) {
      if ('$ref' in (pathObject as ReferenceObject|Paths)) {
        fastify.log.error(`Webhook path ${path} is a reference, references need to be resolved for the plugin to work!`);
        continue;
      }

      if (!path.startsWith("/"))
      {
        fastify.log.warn(`Webhook path ${path} does not start with a slash, slash will be added.`);
        url = `/${url}`;
      }
    }

    const {parameters, ...methods} = pathObject as Paths;

    const params = parseParams(parameters ?? []);

    for (const [method, operation] of Object.entries(methods)) {

      const {parameters, operationId, requestBody, security, ...operationValues} = operation;

      if (!operationId)
      {
        fastify.log.error(`${path} - ${method} is missing operationId! Will be skipped.`)
        continue;
      }

      // Overrides any path params already defined
      const operationParams = parseParams(parameters ?? [], structuredClone(params));

      fastify.route({
        method: method.toUpperCase() as HTTPMethods,
        // fastify wants 'path/:param' instead of openapis 'path/{param}'
        url: url.replace(/{(\w+)}/g, ":$1"),
        handler: routesInfo.operationHandlers[operationId] ?? defaultHandler,
        config: operationValues["x-fastify-config"], 
        schema: createRouteSchema(operationParams, requestBody),
        // Operation security overrides global security
        preParsing: createSecurityProcessors(routesInfo.securityHandlers ?? {}, security ?? routesInfo.globalSecurity), 
        
      });
    }
  }
}