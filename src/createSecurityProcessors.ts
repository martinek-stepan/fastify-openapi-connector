import { FastifyReply, FastifyRequest } from 'fastify';
import { SecurityHandlers, SecuritySpecification } from './types.js';

export const createSecurityProcessors = (handlers: SecurityHandlers, securityObject?: SecuritySpecification) => {
  // No security, or empty array means we do not validate
  if (!securityObject || securityObject.length === 0) {
    return;
  }

  return async (req: FastifyRequest, res: FastifyReply) => {
    let optionalSecurity = false;
    for (const item of securityObject) {
      if (Object.keys(item).length === 0) {
        optionalSecurity = true;
        continue;
      }

      for (const [resolverName, scopes] of Object.entries(item)) {
        const handler = handlers[resolverName];
        if (!handler) {
          req.log.warn(`Missing security resolver '${resolverName}!'`);
          continue;
        }

        try {
          // We got sucesfully resolved authentication
          if (await handler(req, scopes)) {
            return;
          }
        } catch (error) {
          req.log.debug(error, 'Security validation error');
        }
      }
    }

    // Security was optional, so we do not return 401
    if (optionalSecurity) {
      return;
    }

    req.log.debug('None of the security objects were succesfully resolver, returning 401');
    res.code(401).send('Unauthorized');
  };
};
