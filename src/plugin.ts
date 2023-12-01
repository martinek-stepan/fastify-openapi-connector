import { FastifyPluginAsync, HTTPMethods } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { Options, Paths } from './types.js';
import { registerComponents } from './components.js';
import { parseParams } from './parseParams.js';
import { createSecurityProcessors } from './createSecurityProcessors.js';
import { createRouteSchema } from './routeSchema.js';
import { defaultHandler } from './defaultOperationHandler.js';


// define plugin using promises
const myPluginAsync: FastifyPluginAsync<Options> = async (fastify, {openApiSpecification, securityHandlers, operationHandlers}) => {

  const {components, security: globalSecurity, paths} = openApiSpecification;
  
  registerComponents(fastify, components);
  
  for (const [path, pathObject] of Object.entries(paths)) {
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
        url: path.replace(/{(\w+)}/g, ":$1"),
        handler: operationHandlers[operationId] ?? defaultHandler,
        config: operationValues["x-fastify-config"], 
        schema: createRouteSchema(operationParams, requestBody),
        // Operation security overrides global security
        preParsing: createSecurityProcessors(securityHandlers ?? {}, security ?? globalSecurity), 
        
      });
    }
  }
}

export const openApiConnectorPlugin = fastifyPlugin(myPluginAsync, {
	fastify: ">=4.0.0",
	name: "fastify-openapi-connector"
})

