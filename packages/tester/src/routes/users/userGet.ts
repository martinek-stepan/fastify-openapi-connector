import type { TypedHandler, TypedResponseAsync } from '../../generated/types.js';

export const userGet: TypedHandler<'userGet'> = async (req, reply): TypedResponseAsync<'userGet'> => {
  console.log(req.query);
  return reply.code(500).send({
    message: "Not Implemented",
    code: 500
  });
}