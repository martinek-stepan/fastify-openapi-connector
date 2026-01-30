import type { TypedRequestBase, TypedHandlerBase, TypedResponseBase, TypedResponseBaseSync, TypedResponseBaseAsync } from 'fastify-openapi-connector';
import type { operations } from './schema.ts';

export type TypedRequest<T extends keyof operations> = TypedRequestBase<operations, T>;  
export type TypedResponse<T extends keyof operations> = TypedResponseBase<operations, T>;
export type TypedResponseSync<T extends keyof operations> = TypedResponseBaseSync<operations, T>;
export type TypedResponseAsync<T extends keyof operations> = TypedResponseBaseAsync<operations, T>;
export type TypedHandler<T extends keyof operations> = TypedHandlerBase<operations, T>;
