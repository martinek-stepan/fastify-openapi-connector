import { FastifyReply, FastifyRequest } from 'fastify';

export const defaultHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  req.log.error(`Missing operation handler for operation ${req.method} ${req.routerPath}`);
  rep.code(501).send('Not implemented');
};
