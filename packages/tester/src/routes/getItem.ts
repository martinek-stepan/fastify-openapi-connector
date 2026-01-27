import type { TypedHandler, TypedResponseAsync } from '../generated/types.ts';

export const getItem: TypedHandler<'getItem'> = async (req, reply): TypedResponseAsync<'getItem'> => {
  return 'aaaaa';
}
