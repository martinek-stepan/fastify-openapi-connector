import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { registerComponents } from './components.js';
import { determinePrefix } from './determinePrefix.js';
import { setupRoutes } from './setupRoutes.js';
import { Options } from './types.js';

// define plugin using promises
const myPluginAsync: FastifyPluginAsync<Options> = async (fastify, { openApiSpecification, securityHandlers, operationHandlers, settings }) => {
  const { components, security: globalSecurity, paths, webhooks, servers } = openApiSpecification;

  const prefix = determinePrefix(settings, servers);

  const register = (fastify: FastifyInstance) => {
    registerComponents(fastify, components);

    if (settings?.initializePaths !== false && paths) {
      setupRoutes(fastify, { operationHandlers, paths, globalSecurity, securityHandlers }, false);
    }

    if (settings?.initializeWebhooks !== false && webhooks) {
      setupRoutes(fastify, { operationHandlers, paths: webhooks, globalSecurity, securityHandlers }, true);
    }

    if (!paths && !webhooks) {
      fastify.log.error('No paths or webhooks found in OpenAPI specification!');
    }
  };

  if (prefix) {
    fastify.register((instance) => register(instance), { prefix });
  } else {
    register(fastify);
  }
};

export const openApiConnectorPlugin = fastifyPlugin(myPluginAsync, {
  fastify: '>=4.0.0',
  name: 'fastify-openapi-connector',
});
