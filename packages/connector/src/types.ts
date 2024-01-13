import { FastifyContextConfig, FastifyReply, FastifyRequest, FastifyRequestContext } from 'fastify';

export interface PrefixExtractingSettings {
  // If defined, will try to find specific server based on url (Top priority)
  urlRegex?: RegExp;
  // If defined, will try to find specific server based on description (Second priority)
  descriptionRegex?: RegExp;
  // Variable containing prefix, if not defined prefix will be extracted from url behind last /
  prefixVariable?: string;
}

export interface Options {
  //validateContentTypeResolvers?: boolean;
  securityHandlers?: SecurityHandlers;
  operationHandlers: OperationHandlers | OperationHandlersUntyped;
  openApiSpecification: OpenAPISpec;

  settings?: {
    // Should routes from paths be initialized? Default true
    initializePaths?: boolean;
    // Should routes from webhooks be initialized? Default false
    initializeWebhooks?: boolean;
    // Prefix to be used for all routes, either string or object with settings for extracting prefix from servers
    prefix?: string | PrefixExtractingSettings;
    // Should x-security be used? Default false
    useXSecurity?: boolean;
    // Should defined responses be validated? Default true
    validateResponses?: boolean;
  };
}

// Security handling
export type SecurityHandler = (req: FastifyRequest, scopes?: string[]) => boolean | Promise<boolean>;

export interface SecurityHandlers {
  [resolverName: string]: SecurityHandler | undefined;
}

// Operations handling
export interface OperationHandlers {
  [resolverName: string]: TypedHandlerBase | undefined;
}

export interface OperationHandlersUntyped {
  // biome-ignore lint/suspicious/noExplicitAny: Fastify takes any response and serializes it to JSON.
  [resolverName: string]: ((req: FastifyRequest, reply: FastifyReply) => any) | undefined;
}

// Open API Specification
export type SecuritySpecification = {
  [securityHandlerName: string]: string[] | undefined;
}[];

export interface Components {
  schemas?: Record<string, Record<string, unknown>>;
}

export interface PathsMap {
  [name: string]: unknown;
}

export interface ServerVariableObject {
  enum?: string[];
  default: string;
  description?: string;
}

export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
}

export interface OpenAPISpec {
  components?: Components;
  security?: SecuritySpecification;
  paths?: PathsMap;
  webhooks?: PathsMap;
  servers?: ServerObject[];
}

export interface SpecResponse {
  [statusCode: string]: {
    description: string;
    type?: string;
    content?: unknown;
  };
}

export interface PathOperation {
  operationId?: string;
  parameters?: SchemaParameter[];
  requestBody: unknown;
  security?: SecuritySpecification;
  responses?: SpecResponse;
  'x-fastify-config'?: Omit<FastifyRequestContext<FastifyContextConfig>['config'], 'url' | 'method'>;
}

export type Paths = {
  parameters?: SchemaParameter[];
  'x-security'?: unknown;
} & {
  [method: string]: PathOperation;
};

export type SchemaParametersIn = 'query' | 'path' | 'header' | 'cookie';

export interface SchemaParameter {
  name: string;
  description?: string;
  required?: boolean;
  schema: {
    type: string;
  };
  in: SchemaParametersIn;
}

// Parameters handling
export interface ParsedParameter {
  type: string;
  properties: {
    [name: string]: {
      type: string;
      description?: string;
    };
  };
  required?: string[];
}

export interface ReferenceObject {
  $ref: string;
  summary?: string;
  description?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: We want dynamic type here, to do some typescript magic
type OperationWithParams = { parameters: any };
// biome-ignore lint/suspicious/noExplicitAny: We want dynamic type here, to do some typescript magic
type OperationWithBody = { requestBody: any };
// biome-ignore lint/suspicious/noExplicitAny: We want dynamic type here, to do some typescript magic
type OperationWithResponse = { responses: any };

// First argument is interface with operations, second is name of operation we want to get request type for
export type TypedRequestBase<Ops, T extends keyof Ops> = FastifyRequest<{
  // TypeScript magic, if operation has path parameters, we set them as type, otherwise we set never
  Params: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['path'] : never;
  // TypeScript magic, if operation has query parameters, we set them as type, otherwise we set never
  Querystring: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['query'] : never;
  // TypeScript magic, if operation has requestBody with content application/json (fastify explicitly validate only this type), we set it as type, otherwise we set never
  Body: Ops[T] extends OperationWithBody ? Ops[T]['requestBody']['content']['application/json'] : never;
}>;

/** First argument is interface with operations, second is name of operation we want to get response type for
 * As what ever you retunr in fastify will be treated as 200 response, we want to restrict this to only valid responses
 * If operation has 200 response with content application/json, we set it as type (or FastifyReply), otherwise we set FastifyReply
 * That way we can wither return strongly typed response or just FastifyReply where we can set any additional information like code, headers, etc.
 */
export type TypedResponseBaseSync<Ops, T extends keyof Ops> = Ops[T] extends OperationWithResponse
  ? FastifyReply | Ops[T]['responses']['200']['content']['application/json']
  : FastifyReply;

export type TypedResponseBase<Ops, T extends keyof Ops> = TypedResponseBaseSync<Ops, T> | Promise<TypedResponseBaseSync<Ops, T>>;

/**
 * Base type for operation handlers functions
 * !!! IMPORTANT !!!
 * As TypeScript does not enforce return type of function (but provides suggestions) you should define your handles as follows:
 * `const myHandler: TypedHandlerBase = (req, reply): TypedResponseBase<Ops, T> => {`
 */
export interface TypedHandlerBase<Ops = Record<string, unknown>, T extends keyof Ops = keyof Ops> {
  (req: TypedRequestBase<Ops, T>, reply: FastifyReply): TypedResponseBase<Ops, T>;
}
