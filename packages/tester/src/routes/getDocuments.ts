import type { TypedHandler, TypedResponseAsync } from '../generated/types.ts';

export const getDocuments: TypedHandler<'getDocuments'> = async (req, reply): TypedResponseAsync<'getDocuments'> => {
  return reply.code(500).send({
    message: "Not Implemented",
    //code: 500
  } as unknown as {message: string, code: number});
}
