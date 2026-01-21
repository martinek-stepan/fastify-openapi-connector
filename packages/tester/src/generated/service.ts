// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!
import type { OperationHandlers, SecurityHandlers } from 'fastify-openapi-connector';
import { healthGet } from '../routes/healthGet.js';
import { usersGet } from '../routes/usersGet.js';
import { userGet } from '../routes/userGet.js';
import { teamsGet } from '../routes/teamsGet.js';
import { testSec } from '../securityHandlers/test-sec.js';
import type { operations } from './schema.js';

export const pathHandlers: OperationHandlers<operations> = {
  'healthGet': healthGet,
  'usersGet': usersGet,
  'userGet': userGet,
  'teamsGet': teamsGet,
};

export const securityHandlers: SecurityHandlers = {
  'test-sec': testSec,
};
