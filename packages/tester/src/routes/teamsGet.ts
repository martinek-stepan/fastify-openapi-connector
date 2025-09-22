import type { TypedHandler, TypedResponseAsync } from '../generated/types.ts';

export const teamsGet: TypedHandler<'teamsGet'> = async (req, reply): TypedResponseAsync<'teamsGet'> => {
  console.log(req.query);
  return reply.code(500).send({
    message: "Not Implemented",
    code: 500
  });
}
