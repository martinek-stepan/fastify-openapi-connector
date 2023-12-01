import { FastifyPluginAsync } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { Options } from './types.js';
import { registerComponents } from './components.js';
import { setupRoutes } from './setupRoutes.js';


// define plugin using promises
const myPluginAsync: FastifyPluginAsync<Options> = async (fastify, {openApiSpecification, securityHandlers, operationHandlers, settings}) => {

  const {components, security: globalSecurity, paths, webhooks} = openApiSpecification;
  
  registerComponents(fastify, components);

  if (settings?.initializePaths !== false && paths)
  {
    setupRoutes(fastify, {operationHandlers, paths, globalSecurity, securityHandlers}, false);
  }

  if (settings?.initializeWebhooks !== false && webhooks)
  {
    setupRoutes(fastify, {operationHandlers, paths: webhooks, globalSecurity, securityHandlers}, true);
  }

  if (!paths && !webhooks)
  {
    fastify.log.error(`No paths or webhooks found in OpenAPI specification!`);
  }
}

export const openApiConnectorPlugin = fastifyPlugin(myPluginAsync, {
	fastify: ">=4.0.0",
	name: "fastify-openapi-connector"
})

