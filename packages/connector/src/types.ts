import type { FastifyContextConfig, FastifyReply, FastifyRequest, FastifyRequestContext, RouteHandler } from 'fastify';

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

// biome-ignore lint/suspicious/noExplicitAny: We can not pass typed options to plugin
export interface Options<Ops = any> {
  //validateContentTypeResolvers?: boolean;
  securityHandlers?: SecurityHandlers;
  operationHandlers: OperationHandlers<Ops> | OperationHandlersUntyped;
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
    // Dereference any $ref in the OAS before processing. Default true
    dereferenceOAS?: boolean;
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
export type OperationHandlers<Ops = Record<string, unknown>, Content = 'application/json'> = {
  [K in keyof Ops]: TypedHandlerBase<Ops, K, Content>;
};
// Dictionary of "untyped" (using base FastifyRequest without typed body and paremeters) operation handlers, where key is operationId from OAS
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
  parameters?: Record<string, SchemaParameter>;
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
  parameters?: (SchemaParameter | ReferenceObject)[];
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

type RecordToTuple<T> = [keyof T] extends [never]
  ? [] // Stop recursion when the record is empty
  : T extends Record<string, unknown>
    ? {
        [K in keyof T]: [T[K], ...RecordToTuple<Omit<T, K>>];
      }[keyof T]
    : [];

type evaluate<T> = { [K in keyof T]: T[K] } & unknown;
/**
 * XOR type for two types.
 */
type xor<A, B> = evaluate<A & { [K in keyof B]?: undefined }> | evaluate<B & { [K in keyof A]?: undefined }>;

/**
 * XOR type for multiple types.
 * Recursively applies `xor2` to combine all types into a mutually exclusive type.
 */
type ArrayToXor<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? Rest extends unknown[]
    ? xor<First, ArrayToXor<Rest>>
    : First
  : unknown;

type TransformOperationsToReply<Ops, T extends keyof Ops> = Ops[T] extends { responses: infer Responses }
  ? {
      [StatusCode in keyof Responses]: Responses[StatusCode] extends { content: infer Content }
        ? ArrayToXor<RecordToTuple<Content>> // Flatten the `content` property
        : never; // If content does not exist it should not be provided
    }
  : never;

type TypedFastifyReply<Ops, T extends keyof Ops> = FastifyReply<{
  Reply: TransformOperationsToReply<Ops, T>;
}>;

/**
 * First argument is interface with operations, second is name of operation we want to get request type for
 */
export type TypedRequestBase<Ops, T extends keyof Ops, Content = 'application/json'> = FastifyRequest<{
  Params: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['path'] : never;
  Querystring: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['query'] : never;
  Body: Ops[T] extends OperationWithBody
    ? Content extends keyof Ops[T]['requestBody']['content']
      ? Ops[T]['requestBody']['content'][Content]
      : never
    : never;
}>;

export type TypedRouteHandler<Ops, T extends keyof Ops, Content = 'application/json'> = RouteHandler<{
  Params: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['path'] : never;
  Querystring: Ops[T] extends OperationWithParams ? Ops[T]['parameters']['query'] : never;
  Body: Ops[T] extends OperationWithBody
    ? Content extends keyof Ops[T]['requestBody']['content']
      ? Ops[T]['requestBody']['content'][Content]
      : never
    : never;
  Reply: TransformOperationsToReply<Ops, T>;
}>;
/** First argument is interface with operations, second is name of operation we want to get response type for
 * As what ever you retunr in fastify will be treated as 200 response, we want to restrict this to only valid responses
 * If operation has 200 response with content application/json, we set it as type (or FastifyReply), otherwise we set FastifyReply
 * That way we can wither return strongly typed response or just FastifyReply where we can set any additional information like code, headers, etc.
 */
export type TypedResponseBaseSync<Ops, T extends keyof Ops, Content = 'application/json'> = Ops[T] extends OperationWithResponse
  ?
      | TypedFastifyReply<Ops, T>
      | (Content extends keyof Ops[T]['responses']['200']['content'] ? Ops[T]['responses']['200']['content'][Content] : never)
  : TypedFastifyReply<Ops, T>;
export type TypedResponseBaseAsync<Ops, T extends keyof Ops, Content = 'application/json'> = Promise<
  TypedResponseBaseSync<Ops, T, Content>
>;
export type TypedResponseBase<Ops, T extends keyof Ops, Content = 'application/json'> =
  | TypedResponseBaseSync<Ops, T, Content>
  | Promise<TypedResponseBaseSync<Ops, T, Content>>;
/**
 * Base type for operation handlers functions
 * !!! IMPORTANT !!!
 * As TypeScript does not enforce return type of function (but provides suggestions) you should define your handles as follows:
 * `const myHandler: TypedHandlerBase = (req, reply): TypedResponseBase<Ops, T> => {`
 */
export type TypedHandlerBase<Ops = Record<string, unknown>, T extends keyof Ops = keyof Ops, Content = 'application/json'> = (
  req: TypedRequestBase<Ops, T, Content>,
  reply: TypedFastifyReply<Ops, T>,
) => TypedResponseBase<Ops, T, Content>;
