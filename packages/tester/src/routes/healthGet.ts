import type { TypedHandler, TypedResponseAsync } from '../generated/types.js';

export const healthGet: TypedHandler<'healthGet'> = async (req, reply): TypedResponseAsync<'healthGet'> => {
    console.log(req.query);
    return {
      status: 'ok'
    }
}
