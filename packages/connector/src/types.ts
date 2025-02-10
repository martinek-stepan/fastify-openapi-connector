import type { FastifyContextConfig, FastifyReply, FastifyRequest, FastifyRequestContext } from 'fastify';

/**
 * Settings used to determine prefix from servers section of OAS
 */
export interface PrefixExtractingSettings {
  // If defined, will try to find specific server based on url (Top priority)
  urlRegex?: RegExp;
  // If defined, will try to find specific server based on description (Second priority)
  descriptionRegex?: RegExp;
  // Variable containing prefix, if not defined prefix will be extracted from url behind last /
  prefixVariable?: string;
}

/**
 *  Options used to setup the plugin
 */
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
    // Possible content types used to setup validation based on spec. Prioritized list from first to last. Default ['application/json']
    contentTypes?: string[];
  };
}

// Security handling
/**
 *  Type for security handler function that will be used to check if user has access to specific route
 */
export type SecurityHandler = (req: FastifyRequest, scopes?: string[]) => boolean | Promise<boolean>;

/**
 * Dictionary of security handlers, where key is securitySchema name from OAS
 */
export interface SecurityHandlers {
  [resolverName: string]: SecurityHandler | undefined;
}

// Operations handling
/**
 * Dictionary of operation handlers, where key is operationId from OAS
 */
export interface OperationHandlers {
  [resolverName: string]: TypedHandlerBase | undefined;
} // Dictionary of "untyped" (using base FastifyRequest without typed body and paremeters) operation handlers, where key is operationId from OAS
export interface OperationHandlersUntyped {
  // biome-ignore lint/suspicious/noExplicitAny: Fastify takes any response and serializes it to JSON.
  [resolverName: string]: ((req: FastifyRequest, reply: FastifyReply) => any) | undefined;
}

// Open API Specification
/**
 * Typed security section of OAS
 */
export type SecuritySpecification = {
  [securityHandlerName: string]: string[] | undefined;
}[];
/**
 * Typed components section of OAS
 */
export interface Components {
  schemas?: Record<string, Record<string, unknown>>;
}

/**
 * Typed paths section of OAS
 */
export interface PathsMap {
  [name: string]: unknown;
}

/**
 * Typed server variable object of OAS
 */
export interface ServerVariableObject {
  enum?: string[];
  default: string;
  description?: string;
}

/**
 * Typed sever object of OAS
 */
export interface ServerObject {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
}

/**
 * Typed OAS
 */
export interface OpenAPISpec {
  components?: Components;
  security?: SecuritySpecification;
  paths?: PathsMap;
  webhooks?: PathsMap;
  servers?: ServerObject[];
}

/**
 * Typed response object of OAS
 */
export interface SpecResponse {
  [statusCode: string]: {
    description: string;
    type?: string;
    content?: unknown;
  };
}

/**
 * Typed operation object of OAS
 */
export interface PathOperation {
  operationId?: string;
  parameters?: SchemaParameter[];
  requestBody: unknown;
  security?: SecuritySpecification;
  responses?: SpecResponse;
  'x-fastify-config'?: Omit<FastifyRequestContext<FastifyContextConfig>['config'], 'url' | 'method'>;
}

/**
 * Typed paths object of OAS
 */
export type Paths = {
  parameters?: SchemaParameter[];
  'x-security'?: unknown;
} & {
  [method: string]: PathOperation;
};

/**
 * Typed possible in paremeter values of OAS
 */
export type SchemaParametersIn = 'query' | 'path' | 'header' | 'cookie';

/**
 * Typed schema parameter object of OAS
 */
export interface SchemaParameter {
  name: string;
  description?: string;
  required?: boolean;
  schema: {
    type: string;
  };
  in: SchemaParametersIn;
}

/**
 * Parameters handling
 */
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

/**
 * Typed reference object of OAS
 */
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

/**
 * First argument is interface with operations, second is name of operation we want to get request type for
 */
export type TypedRequestBase<Ops, T extends keyof Ops, Content = 'application/json'> = FastifyRequest<{
  // TypeScript magic, if operation has path parameters, we set them as type, otherwise we set never
  Params: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['path'] : never;
  // TypeScript magic, if operation has query parameters, we set them as type, otherwise we set never
  Querystring: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['query'] : never;
  // TypeScript magic, if operation has requestBody with content Content type, we set it as type, otherwise we set never
  Body: Ops[T] extends OperationWithBody
    ? Content extends keyof Ops[T]['requestBody']['content']
      ? Ops[T]['requestBody']['content'][Content]
      : never
    : never;
}>;

/** First argument is interface with operations, second is name of operation we want to get response type for
 * As what ever you retunr in fastify will be treated as 200 response, we want to restrict this to only valid responses
 * If operation has 200 response with content application/json, we set it as type (or FastifyReply), otherwise we set FastifyReply
 * That way we can wither return strongly typed response or just FastifyReply where we can set any additional information like code, headers, etc.
 */
export type TypedResponseBaseSync<Ops, T extends keyof Ops, Content = 'application/json'> = Ops[T] extends OperationWithResponse
  ? FastifyReply | (Content extends keyof Ops[T]['responses']['200']['content'] ? Ops[T]['responses']['200']['content'][Content] : never)
  : FastifyReply;

export type TypedResponseBaseAsync<Ops, T extends keyof Ops> = Promise<TypedResponseBaseSync<Ops, T>>;

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
