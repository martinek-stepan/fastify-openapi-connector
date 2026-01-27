// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!
import type { OperationHandlers, SecurityHandlers } from 'fastify-openapi-connector';
import { getDocuments } from '../routes/getDocuments.ts';
import { getItem } from '../routes/getItem.ts';
import { getItems } from '../routes/getItems.ts';
import { teamsGet } from '../routes/teamsGet.ts';
import { usersGet } from '../routes/usersGet.ts';
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
