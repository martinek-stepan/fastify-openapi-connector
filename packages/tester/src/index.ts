import { bundle, createConfig } from '@redocly/openapi-core';
import { fastify } from 'fastify';
import type { OpenAPISpec, Options } from 'fastify-openapi-connector';
import { openApiConnectorPlugin } from 'fastify-openapi-connector';
import type { operations } from './generated/schema.ts';
import { pathHandlers, securityHandlers } from './generated/service.ts';

  const app = fastify({
    bodyLimit: 6_291_456,
    disableRequestLogging: true,
    logger: true,
  });

  app.setErrorHandler(async (err, req, reply) => {
    req.log.error(err);
    req.log.info(req.body);
    if (err.validation) {
      await reply.status(400).send({ detail: err.message, status: 400 });
      return;
    }

    await reply.status(500).send({ detail: 'Unexpected error', status: 500 });
  });


  const config = await createConfig({
    extends: ['minimal']
  });
  const bundleResults = await bundle({ config, ref: './openapi.yaml' });

  const spec = bundleResults.bundle.parsed as OpenAPISpec;

  const options: Options<operations> = {
    openApiSpecification: spec,
    operationHandlers: pathHandlers,
    settings: {
      initializePaths: true,
      useXSecurity: true,
      validateResponses: true,
    },
  };

  await app.register(openApiConnectorPlugin, options);

  // eslint-disable-next-line @typescript-eslint/require-await
  app.addHook('preHandler', async (req) => {
    req.log.info({ method: req.method, url: req.url  , body: req.body ?? undefined }, `Pre handler ${req.method} ${req.url}`);
  });
  app.addHook('preValidation', async (req) => {
    req.log.info({ method: req.method, url: req.url  , body: req.body ?? undefined }, `Pre validation ${req.method} ${req.url}`);
  });
  app.addHook('preSerialization', async (req, _reply, payload) => {
    req.log.info({ method: req.method, url: req.url  , payload }, `Pre serialization ${req.method} ${req.url}`);
  });
  app.addHook('onSend', async (req, _reply, payload) => {
    req.log.info({ method: req.method, url: req.url  , payload }, `On Send ${req.method} ${req.url}`);
  });


  try {
    await app.listen({ host: '0.0.0.0', port: 3333 });
  } catch (error) {
    const schemas = app.getSchemas();
    console.log(schemas);
    console.log(app.printRoutes());
    console.log(error);
    app.log.error(error, 'Fastify startup failed');
  }
