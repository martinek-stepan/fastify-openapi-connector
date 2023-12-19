import parser from 'yargs-parser';
import { generate, OpenAPISpec } from './generator.js';
import { bundle, createConfig } from '@redocly/openapi-core';

const HELP = `Usage
 $ fastify-openapi-connector-generator [options]

 Options:
  --help                     Display this
  --schema-file              [Required] Path to schema file generated by openapi-typescript.
  --types-file               [Required] Path to where types file should be generated.
  --service-file             [Required] Path to where service file should be generated.
  --spec-file                [Required] Path to OpenAPI spec file
  --paths-dir                [Optional] Directory to generate route handlers from paths section of OAS.
  --webhooks-dir             [Optional] Directory to generate route handlers from webhooks section of OAS.
  --security-dir             [Optional] Directory to generate security handlers.
  --untyped                  [Optional] Indicates that generated handlers should be untyped.
  --override-types-file      [Optional] Indicates that types file should be overrided if exists.
`;

const [, , ...args] = process.argv;
const flags = parser(args, {
  boolean: ['untyped', 'help', 'overrideTypesFile'],
  string: ['specFile', 'schemaFile', 'pathsDir', 'webhooksDir', 'securityDir', 'typesFile', 'serviceFile'],
});

if ('help' in flags) {
  console.info(HELP);
  process.exit(0);
}

if (!('schemaFile' in flags)) {
  console.info('--schema-file option is required! (Use opetion --help for more info)');
  process.exit(-1);
}

if (!('typesFile' in flags)) {
  console.info('--types-file option is required! (Use opetion --help for more info)');
  process.exit(-1);
}

if (!('serviceFile' in flags)) {
  console.info('--service-file option is required! (Use opetion --help for more info)');
  process.exit(-1);
}

if (!('specFile' in flags)) {
  console.info('--spec-file option is required! (Use opetion --help for more info)');
  process.exit(-1);
}

const config = await createConfig({}, { extends: ['recommended-strict'] });
const bundleResults = await bundle({ ref: flags.specFile, config, dereference: false });

await generate({
  schemaFilePath: flags.schemaFile,
  spec: bundleResults.bundle.parsed as OpenAPISpec,
  typesPath: flags.typesFile,
  servicePath: flags.serviceFile,
  routesPath: flags.pathsDir,
  webhooksPath: flags.webhooksDir,
  securityPath: flags.securityDir,
  typed: !flags.untyped,
  overrideTypesFile: !!flags.overrideTypesFile,
});