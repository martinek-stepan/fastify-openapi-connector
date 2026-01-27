// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!
import type { OperationHandlers, SecurityHandlers } from 'fastify-openapi-connector';
import { healthGet } from '../routes/healthGet.js';
import { userGet } from '../routes/users/userGet.js';
import { usersGet } from '../routes/users/usersGet.js';
import { teamsGet } from '../routes/teams/teamsGet.js';
import { testSec } from '../securityHandlers/test-sec.js';
import type { operations } from './schema.js';

export const pathHandlers: OperationHandlers<operations> = {
  'healthGet': healthGet,
  'userGet': userGet,
  'usersGet': usersGet,
  'teamsGet': teamsGet,
};

export const securityHandlers: SecurityHandlers = {
  'test-sec': testSec,
};
