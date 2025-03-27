import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Default handler for operations that do not have a handler
 * @param req Fastify request
 * @param rep Fastify reply
 */
export const defaultHandler = async (req: FastifyRequest, rep: FastifyReply): Promise<void> => {
  req.log.error(`Missing operation handler for operation ${req.method} ${req.routeOptions.url}`);
  rep.code(501).send('Not implemented');
};
