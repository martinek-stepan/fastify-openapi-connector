// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!
import type { OperationHandlers, SecurityHandlers } from 'fastify-openapi-connector';
import { usersGet } from '../routes/users/usersGet.ts';
import { teamsGet } from '../routes/teams/teamsGet.ts';
import { getItems } from '../routes/getItems.ts';
import { getItem } from '../routes/getItem.ts';
import { getDocuments } from '../routes/getDocuments.ts';
import { testSec } from '../securityHandlers/test-sec.ts';
import type { operations } from './schema.ts';

export const pathHandlers: OperationHandlers<operations> = {
  'usersGet': usersGet,
  'teamsGet': teamsGet,
  'getItems': getItems,
  'getItem': getItem,
  'getDocuments': getDocuments,
};

export const securityHandlers: SecurityHandlers = {
  'test-sec': testSec,
};
