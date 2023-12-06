# Fastify OpenAPI Connector plugin

## Summary
Typescript Node.js package for setting up fastify based on OpenAPI specification

## Installation

### npm
`npm i --save fastify-openapi-connector`

### yarn
`yarn add fastify-openapi-connector`

## Description

Plugin for fastify written in Typescript that can be used to set-up your route & security handlers according to OpenAPI specification (version 3.1).

Includes setting up of validation (done natively by fastify utilizing ajv)

The aim is to finish full OpenAPI v3.1 specification compatibility and support future versions of it and Fastify 4+.

Version 1.0.0 would be once the full OpenAPI compatibility with Fastify 4 is achieved.

## Disclaimer

This library is heavily inspired by https://www.npmjs.com/package/fastify-openapi-glue which is lot more mature & suports older versions of OpenAPI.

Main reason for creating this library were issues I had running my API with ts-node/esm loader.


## Usage

The package is designed to have minimal dependencies (`fastify-plugin` + `fastify` as peer dependecy) and give user as much freedom as possible.

### Plugin Options

To initialize fastify plugin, following Options object is expected:
```ts
interface Options
{
  securityHandlers?: SecurityHandlers;
  operationHandlers: OperationHandlers;
  openApiSpecification: OpenAPISpec;
}
```
#### openApiSpecification
As this package does not dictate user which serialization method to use with their specification (`json` / `yaml`) user needs to load and deserialize it. Parsed specification is passed as object into property `openApiSpecification`.

#### operationHandlers
At this moment this package does not support webhooks so another required property is `operationHandlers` defined as:
```ts
export interface OperationHandlers
{
  [resolverName: string]: (req: any, reply: any) => any | undefined;
}
```
It is expected that you pass map of fastify handlers with operationId from specification as key.

If handler for operation is missing, default handler which logs error and returns `501` is set-up. 

#### securityHandlers
Last property which is **optional** is `securityHandlers` which accept following object:
```ts
export interface SecurityHandlers
{
  [resolverName: string]: SecurityHandler | undefined;
}
```
As in OpenAPI multiple Security Handlers are permitted for operation (Also operation handlers override global handler). Pre-handler hook is set to validate security if any exist.

For the same reason (multiple possible handlers) the `SecurityHandler` is defined as follow:
```ts
export type SecurityHandler = (req: FastifyRequest, scopes?: string[]) => boolean | Promise<boolean>;
```
You will recieve `FastifyRequest` and scopes defined for the operation, but you are not having access to `FastifyReply` as failure to validate one schema does not mean authorization failed.

If you throw exception from `SecurityHandler`, the error will be logged in `debug` message.

If `SecurityHandler` defined in spec is not present `warning` message is printed.

If none of `SecurityHandlers` return true, reply will be issued with code `401`.

### Initialization
```ts
const options: Options = {
  openApiSpecification: spec,
  operationHandlers: service,
  securityHandlers: security
}

fastify.register(openApiConnectorPlugin, options);
```

#### Using yaml spec example
```ts
import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';

var yamlPath = resolve('spec.yaml');
const specFile = readFileSync(yamlPath, 'utf8');
const spec = parse(specFile) as OpenAPISpec;
```

### Shortcomings

* Currently cookie paramters are not supported as fastify does not validate cookies out of the box.
* Subset of OpenAPI v3.1 is used for now
* Only references to components/schemas in the spec will be resolved when schema validation is registered, however you can register external references to fastify manually with `fastify.addSchema` method.

### Contribution

Bugreports & pull requests are welcome!