import type { TypedHandler, TypedResponseAsync } from '../generated/types.ts';

export const usersGet: TypedHandler<'usersGet'> = async (req, reply): TypedResponseAsync<'usersGet'> => {
  console.log(req.query);

  return reply.code(400).send({ code:  123, message: "Asb"});
}
