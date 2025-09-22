// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!
import type { OperationHandlers } from 'fastify-openapi-connector';
import { usersGet } from '../routes/usersGet.ts';
import { teamsGet } from '../routes/teamsGet.ts';
import type { operations } from './schema.ts';

export const pathHandlers: OperationHandlers<operations> = {
  'usersGet': usersGet,
  'teamsGet': teamsGet,
};
