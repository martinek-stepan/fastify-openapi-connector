import type { FastifyRequest } from 'fastify';
  
export const testSec = (req: FastifyRequest, scopes?: string[]): boolean | Promise<boolean> => {
  return true;
}
