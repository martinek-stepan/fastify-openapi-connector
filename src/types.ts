import { FastifyContextConfig, FastifyRequest, FastifyRequestContext } from "fastify";

export interface Options
{
  //validateContentTypeResolvers?: boolean;
  securityHandlers?: SecurityHandlers;
  operationHandlers: OperationHandlers;
  openApiSpecification: OpenAPISpec;

  settings?: {
    // Should routes from paths be initialized? Default true
    initializePaths?: boolean;
    // Should routes from webhooks be initialized? Default true
    initializeWebhooks?: boolean;
  }
}

// Security handling
export type SecurityHandler = (req: FastifyRequest, scopes?: string[]) => boolean | Promise<boolean>;

export interface SecurityHandlers
{
  [resolverName: string]: SecurityHandler | undefined;
}

// Operations handling
// TODO figure out strong typing with inheretance from Fastify Request & Response
export interface OperationHandlers
{
  [resolverName: string]: (req: any, reply: any) => any | undefined;
}

// Open API Specification
export type SecuritySpecification =  {
  [securityHandlerName: string]: string[] | undefined;
}[];

export interface Components {
  schemas: Record<string, any>
}

export interface PathsMap {
  [name: string]: unknown;
}

export interface OpenAPISpec {
  components?: Components;
  security?: SecuritySpecification;
  paths?: PathsMap;
  webhooks?: PathsMap;
};

export interface PathOperation {
  operationId?: string;
  parameters?: SchemaParameter[];
  requestBody: any;
  security?: SecuritySpecification;
  ['x-fastify-config']?: Omit<FastifyRequestContext<FastifyContextConfig>['config'], 'url' | 'method'>;
};

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
};

// Parameters handling
export interface ParsedParameter {
  type: string;
  properties: {
    [name: string]: {
      type: string;
      description?: string;
    }
  };
  required?: string[];
}

export interface ReferenceObject {
  $ref: string;
  summary?: string;
  description?: string;
}