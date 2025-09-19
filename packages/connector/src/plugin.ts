import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { registerComponents } from './components.js';
import { determinePrefix } from './determinePrefix.js';
import { setupRoutes } from './setupRoutes.js';
import type { Options } from './types.js';

// define plugin using promises
const myPluginAsync: FastifyPluginAsync<Options> = async (
  fastify,
  { openApiSpecification, securityHandlers, operationHandlers, settings },
) => {
  const { components = {}, security: globalSecurity, paths, webhooks, servers } = openApiSpecification;

  const prefix = determinePrefix(fastify, settings, servers);

  const setupRoutesAndValidation = async (fastify: FastifyInstance): Promise<void> => {
    registerComponents(fastify, components);

    if (settings?.initializePaths !== false && paths) {
      setupRoutes(
        fastify,
        { operationHandlers, paths, components, globalSecurity, securityHandlers },
        {
          isWebhook: false,
          useXSecurity: settings?.useXSecurity,
          validateResponse: settings?.validateResponses,
          contentTypes: settings?.contentTypes ?? ['application/json'],
        },
      );
    }

    if (settings?.initializeWebhooks === true && webhooks) {
      setupRoutes(
        fastify,
        { operationHandlers, paths: webhooks, components, globalSecurity, securityHandlers },
        {
          isWebhook: true,
          useXSecurity: settings?.useXSecurity,
          validateResponse: settings?.validateResponses,
          contentTypes: settings?.contentTypes ?? ['application/json'],
        },
      );
    }

    if (!paths && !webhooks) {
      fastify.log.error('No paths or webhooks found in OpenAPI specification!');
    }
  };

  fastify.register(setupRoutesAndValidation, { prefix });
};

/**
 * Plugin to connect Fastify with OpenAPI specification
 */
export const openApiConnectorPlugin: FastifyPluginAsync<Options> = fastifyPlugin(myPluginAsync, {
  fastify: '>=4.0.0',
  name: 'fastify-openapi-connector',
});
