# Fastify OpenAPI Connector plugin

## Summary
Typescript Node.js package for setting up Fastify based on OpenAPI specification with minimum dependencies.

## Installation

### npm
`npm i --save fastify-openapi-connector`

### yarn
`yarn add fastify-openapi-connector`

## Description

Plugin for Fastify written in Typescript that can be used to set-up your route, input validation & security handlers according to OpenAPI specification version 3.1.

Setting up of validation is done natively by Fastify utilizing Ajv.

The project is made with minimum depenencies - only `fastify-plugin` + `fastify` as peer dependency.

Currently, the package is considered feature complete as it fullfils the OpenAPI 3.1 specification with Fastify 4. Only not-implemented part is cookies validation [#8](https://github.com/martinek-stepan/fastify-openapi-connector/issues/8), for reasons mentioned in the issue.

### Contribution

Bugreports & pull requests are welcome!

### Disclaimer

This library is heavily inspired by [fastify-openapi-glue](https://www.npmjs.com/package/fastify-openapi-glue) which I recommend if you need the suports of older versions of OpenAPI. So props to the author!

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

The `OpenAPISpec` type is not full OpenAPI specification typed, since that include lot of dynamic fields. 

#### Operation Handlers
**Required** property `operationHandlers` is defined as:
```ts
export interface OperationHandlers
{
  [resolverName: string]: ((req: FastifyRequest, reply: FastifyReply) => any) | undefined;
}
```
It is expected that you pass map of Fastify handlers with `operationId` from specification as key.

If handler for operation is missing, default handler which logs error and returns `501` is set-up & warning is shown on initialization. 

#### Security Handlers
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

If none of `SecurityHandlers` return true and specification does not include notation telling that security is optional, reply will be issued with code `401`.

#### Extra security option on route level
As and extra option, this plugin will also parse x-security tag on route level when you opt-in for it by setting `Options['settings']['useXSecurity']` to true.

Priority then goes `operationSecurity` > `routeSecurity` > `globalSecurity` (overriding higher level if exists)

##### Why?
In case you have lot of routes having same security schema, but different from each other. You can avoid defining the schema on all operations.

Or if you are using Redocly and referencing webhook from external API into your path, it is benefitial to be able to define security on the route you are referencing it into. 

#### Settings
There are few options that can be used to modify behaviour of the plugin

##### initializePaths
Default true, loads & connects `paths` section of specification into fastify.

##### initializeWebhooks
Default false, loads & connects `webhooks` section of specification into fastify.

It is false by default since usual behaviour is to define webhooks your API is firing in OpenAPI specification, not those that you are consuming, but this option will give you choice to do so.

##### prefix
If you want to version your API, you can utilize prefix. This property accepts either `string` which will be used as prefix or following object that will help the plugin to determine prefix to use from Servers section of specification.

```ts
export interface PrefixExtractingSettings {
  // If defined, will try to find specific server based on url (Top priority)
  urlRegex?: RegExp;
  // If defined, will try to find specific server based on description (Second priority)
  descriptionRegex?: RegExp;
  // Variable containing prefix, if not defined prefix will be extracted from url (string behind last /)
  prefixVariable?: string;
}
```

##### useXSecurity
Default false, as mentioned in the [section above](#extra-security-option-on-route-level) this alows using of route level security.

##### validateResponses
Default true, sets if schema from specification will be used for response validation.

### Initialization
```ts
import { OpenAPISpec, Options, openApiConnectorPlugin } from 'fastify-openapi-connector';

...

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

* Currently cookie parameters are not supported as fastify does not validate cookies out of the box.
* Only references to components/schemas in the spec will be resolved when schema validation is registered, however you can register external references to fastify manually with `fastify.addSchema` method.