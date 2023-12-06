import { FastifyContextConfig, FastifyRequest, FastifyRequestContext } from 'fastify';

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
  operationHandlers: OperationHandlers;
  openApiSpecification: OpenAPISpec;

  settings?: {
    // Should routes from paths be initialized? Default true
    initializePaths?: boolean;
    // Should routes from webhooks be initialized? Default true
    initializeWebhooks?: boolean;
    // Prefix to be used for all routes, either string or object with settings for extracting prefix from servers
    prefix?: string | PrefixExtractingSettings;
  };
}

// Security handling
export type SecurityHandler = (req: FastifyRequest, scopes?: string[]) => boolean | Promise<boolean>;

export interface SecurityHandlers {
  [resolverName: string]: SecurityHandler | undefined;
}

// Operations handling
// TODO figure out strong typing with inheretance from Fastify Request & Response
export interface OperationHandlers {
  // biome-ignore lint/suspicious/noExplicitAny: Before I figure out better way to type this to work with raw Fastify and typed request, we use any
  [resolverName: string]: (req: any, reply: any) => any | undefined;
}

// Open API Specification
export type SecuritySpecification = {
  [securityHandlerName: string]: string[] | undefined;
}[];

export interface Components {
  schemas: Record<string, object>;
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

export interface PathOperation {
  operationId?: string;
  parameters?: SchemaParameter[];
  requestBody: unknown;
  security?: SecuritySpecification;
  'x-fastify-config'?: Omit<FastifyRequestContext<FastifyContextConfig>['config'], 'url' | 'method'>;
}

export type Paths = {
  parameters?: SchemaParameter[];
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
