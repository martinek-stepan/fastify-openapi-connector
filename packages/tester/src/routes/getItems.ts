import type { TypedHandler, TypedResponseAsync } from '../generated/types.ts';

export const getItems: TypedHandler<'getItems'> = async (req, reply): TypedResponseAsync<'getItems'> => {
  return [];
}
