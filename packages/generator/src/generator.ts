import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import camelCase from 'just-camel-case';

/**
 * OAS Paths object
 */
export interface PathsObject {
  // biome-ignore lint/suspicious/noExplicitAny: It can be any
  [method: string]: any;
}

/**
 * OAS object
 */
export interface OpenAPISpec {
  components?: {
    securitySchemes?: Record<string, unknown>;
  };
  paths?: PathsObject;
  webhooks?: PathsObject;
}

/**
 * Type of function that generates a file
 */
export type TemplateFunction = (imp: string, operationId: string, typesPath: string) => string;

/**
 * Handler info with optional subpath for subfolder organization
 */
export interface HandlerInfo {
  operationId: string;
  subpath?: string;
}

/**
 * Function to generate handler files
 * @param imp operationId
 * @param typesPath path to types file
 */
export const routeTemplateTyped: TemplateFunction = (
  imp: string,
  operationId: string,
  typesPath: string,
) => `import type { TypedHandler, TypedResponseAsync } from '${typesPath}';

export const ${imp}: TypedHandler<'${operationId}'> = async (req, reply): TypedResponseAsync<'${operationId}'> => {
  return reply.code(501).send("Not Implemented");
}
`;

/**
 * Function to generate untyped handler files
 * @param imp operationId
 * @param typesPath not used
 */
export const routeTemplateUntyped: TemplateFunction = (imp: string, _operationId: string, _typesPath: string) => `import type { FastifyReply, FastifyRequest } from 'fastify';

export const ${imp} = (req: FastifyRequest, reply: FastifyReply): any => {
  return reply.code(501).send("Not Implemented");
}
`;

/**
 * Function to generate security files
 * @param name security name
 */
export const securityTemplate = (name: string): string => `import type { FastifyRequest } from 'fastify';
  
export const ${name} = (req: FastifyRequest, scopes?: string[]): boolean | Promise<boolean> => {
  return false;
}
`;

/**
 * Function to generate handler files
 * @param args setup arguments
 * @returns operationIds
 */
export const parseAndGenerateOperationHandlers = async (args: {
  paths: PathsObject;
  filesPath: string;
  typesPath: string;
  typed: boolean;
  importExtension: string;
}): Promise<HandlerInfo[]> => {
  const handlers: HandlerInfo[] = [];

  for (const pathObj of Object.values(args.paths)) {
    if (typeof pathObj !== 'object' || pathObj === null) {
      continue;
    }

    for (const operationObj of Object.values(pathObj)) {
      if (typeof operationObj !== 'object' || operationObj === null) {
        continue;
      }
      const operationId = (operationObj as { operationId?: string }).operationId;
      if (!operationId) {
        continue;
      }

      // Use x-codegen-path extension for custom subfolder path
      const subpath = (operationObj as { 'x-codegen-path'?: string })['x-codegen-path'];

      handlers.push({ operationId, subpath });
    }
  }

  await generateHandlerFiles({
    handlers,
    path: args.filesPath,
    typesPath: args.typesPath.replace(/.ts$/, `.${args.importExtension}`),
    templateFunction: args.typed ? routeTemplateTyped : routeTemplateUntyped,
  });
  return handlers;
};

/**
 * Function to generate security files
 * @param args setup arguments
 * @returns security hander names
 */
export const parseAndGenerateSecurity = async (args: {
  security: Record<string, unknown>;
  filesPath: string;
}): Promise<HandlerInfo[]> => {
  const handlers: HandlerInfo[] = [];

  for (const security of Object.keys(args.security)) {
    if (security.startsWith('x-')) {
      continue;
    }

    handlers.push({ operationId: security });
  }

  await generateHandlerFiles({
    handlers,
    path: args.filesPath,
    typesPath: '',
    templateFunction: securityTemplate,
  });

  return handlers;
};

/**
 * Entry point function that generates the service and handler files
 * @param args Setup arguments
 */
export const generate = async (args: {
  routesPath?: string;
  servicePath: string;
  spec: OpenAPISpec;
  typesPath: string;
  webhooksPath?: string;
  securityPath?: string;
  schemaFilePath: string;
  typed: boolean;
  overrideTypesFile: boolean;
  importExtension: string;
}): Promise<void> => {
  let pathHandlers: HandlerInfo[] | undefined;
  let webhookHandlers: HandlerInfo[] | undefined;
  let securityHandlers: HandlerInfo[] | undefined;

  if (args.spec.paths && args.routesPath) {
    pathHandlers = await parseAndGenerateOperationHandlers({
      filesPath: args.routesPath,
      typesPath: args.typesPath,
      paths: args.spec.paths,
      typed: args.typed,
      importExtension: args.importExtension,
    });
  }

  if (args.spec.webhooks && args.webhooksPath) {
    webhookHandlers = await parseAndGenerateOperationHandlers({
      filesPath: args.webhooksPath,
      typesPath: args.typesPath,
      paths: args.spec.webhooks,
      typed: args.typed,
      importExtension: args.importExtension,
    });
  }

  if (args.spec.components?.securitySchemes && args.securityPath) {
    securityHandlers = await parseAndGenerateSecurity({
      filesPath: args.securityPath,
      security: args.spec.components.securitySchemes,
    });
  }

  generateTypesFile(args.typesPath, args.schemaFilePath, args.overrideTypesFile, args.importExtension);
  generateServiceFile({
    servicePath: args.servicePath,
    pathHandlers,
    webhookHandlers,
    securityHandlers,
    routesPath: args.routesPath,
    webhooksPath: args.webhooksPath,
    securityPath: args.securityPath,
    typed: args.typed,
    importExtension: args.importExtension,
    schemaFile: args.schemaFilePath,
  });
  console.log('DONE!');
};

/**
 * Function to generate handler files
 * @param args setup arguments
 */
export const generateHandlerFiles = async (args: {
  handlers: HandlerInfo[];
  path: string;
  typesPath: string;
  templateFunction: TemplateFunction;
}): Promise<void> => {
  if (!existsSync(args.path)) {
    mkdirSync(args.path, { recursive: true });
  }

  // Collect all existing files including those in subfolders
  const files: Map<string, boolean> = new Map();
  const existingFiles = await glob(path.resolve(args.path, '**/*.ts'), {
    windowsPathsNoEscape: true,
  });
  for (const file of existingFiles) {
    const relativePath = path.relative(args.path, file).replace(/\\/g, '/').replace(/.ts$/, '');
    files.set(relativePath, true);
  }

  // Find missing implementations
  const missingImplementations = args.handlers.filter((handler) => {
    const filePath = handler.subpath ? `${handler.subpath}/${handler.operationId}` : handler.operationId;
    return !files.has(filePath);
  });

  if (missingImplementations.length) {
    console.log('These operations are missing an implementation:');
    console.log(missingImplementations.map((h) => h.operationId));

    for (const handler of missingImplementations) {
      const subFolder = handler.subpath ? path.join(args.path, handler.subpath) : args.path;

      // Create subfolder if needed
      if (handler.subpath && !existsSync(subFolder)) {
        mkdirSync(subFolder, { recursive: true });
      }

      // Calculate relative path from handler file to types file
      const typesRelative = path
        .relative(subFolder, path.resolve(args.typesPath))
        .replace(/\\/g, '/')
        .replace(/^(?!\.\.?\/)/, './');

      writeFileSync(
        path.join(subFolder, `${handler.operationId}.ts`),
        args.templateFunction(camelCase(handler.operationId), handler.operationId, typesRelative),
      );
    }
  }
};

/**
 * Function to generate handler imports
 * @param args setup arguments
 * @returns handler imports
 */
export const generateHandlerImports = (args: {
  handlers: HandlerInfo[];
  path: string;
  servicePath: string;
  importExtension: string;
}): string[] => {
  return args.handlers.map((handler) => {
    const subPath = handler.subpath ? path.join(args.path, handler.subpath) : args.path;
    const handlerPath = path.relative(path.resolve(args.servicePath, '..'), path.resolve(subPath));
    const importPath = path
      .join(handlerPath, `${handler.operationId}.${args.importExtension}'`)
      .replace(/\\/g, '/')
      .replace(/^(?!\.\.?\/)/, './');
    return `import { ${camelCase(handler.operationId)} } from '${importPath};`;
  });
};

/**
 * Helper interface for sorting handlers
 */
export interface OrganizedHandlers {
  path?: string;
  handlers?: HandlerInfo[];
  exportName: string;
  typeName: string;
  importType: string;
}

/**
 * Sort handlers function, sorting based on path
 * @param a
 * @param b
 * @returns -1/0/1
 */
export const handlersSort = (a: OrganizedHandlers, b: OrganizedHandlers): number => {
  if (!a.path) {
    return -1;
  }

  if (!b.path) {
    return 1;
  }

  return a.path > b.path ? 1 : b.path > a.path ? -1 : 0;
};

/**
 * Function to get the relative schema file path from a base path
 * @param basePath Base file path
 * @param schemaPath Schema file path
 * @param importExtension Import extension
 * @returns Relative schema file path
 */
export const getRelativeSchemaFilePath = (basePath: string, schemaPath: string, importExtension: string): string => {
  return schemaPath.startsWith('@')
    ? schemaPath
    : path
        .relative(path.resolve(basePath, '..'), path.resolve(schemaPath.replace(/.ts$/, `.${importExtension}`)))
        .replace(/\\/g, '/')
        .replace(/^(?!\.\.?\/)/, './');
};

/**
 * Generets types file
 * @param typesFilePath Path where to generate
 * @param schemaPath  Path to schema file
 * @param overrideTypesFile Indicates that types file should be overrided if exists
 * @returns
 */
export const generateTypesFile = (typesFilePath: string, schemaPath: string, overrideTypesFile: boolean, importExtension: string): void => {
  if (existsSync(typesFilePath) && !overrideTypesFile) {
    console.log('Types file already exists. Skipping generation.');
    return;
  }

  const relativeSchemaPath = getRelativeSchemaFilePath(typesFilePath, schemaPath, importExtension);
  const content = `import type { TypedRequestBase, TypedHandlerBase, TypedResponseBase, TypedResponseBaseSync, TypedResponseBaseAsync } from 'fastify-openapi-connector';
import type { operations } from '${relativeSchemaPath}';

export type TypedRequest<T extends keyof operations> = TypedRequestBase<operations, T>;  
export type TypedResponse<T extends keyof operations> = TypedResponseBase<operations, T>;
export type TypedResponseSync<T extends keyof operations> = TypedResponseBaseSync<operations, T>;
export type TypedResponseAsync<T extends keyof operations> = TypedResponseBaseAsync<operations, T>;
export type TypedHandler<T extends keyof operations> = TypedHandlerBase<operations, T>;
`;

  writeFileSync(typesFilePath, content);
};

/**
 * Function to generate service file
 * @param args setup arguments
 */
export const generateServiceFile = (args: {
  pathHandlers?: HandlerInfo[];
  webhookHandlers?: HandlerInfo[];
  securityHandlers?: HandlerInfo[];
  routesPath?: string;
  webhooksPath?: string;
  securityPath?: string;
  servicePath: string;
  typed: boolean;
  importExtension: string;
  schemaFile: string;
}) => {
  let serviceTs = '// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!\n';

  const organizedHandlers: OrganizedHandlers[] = [
    {
      path: args.routesPath,
      handlers: args.pathHandlers,
      exportName: 'pathHandlers',
      typeName: args.typed ? 'OperationHandlers<operations>' : 'OperationHandlersUntyped',
      importType: args.typed ? 'OperationHandlers' : 'OperationHandlersUntyped',
    },
    {
      path: args.webhooksPath,
      handlers: args.webhookHandlers,
      exportName: 'webhookHandlers',
      typeName: args.typed ? 'OperationHandlers<operations>' : 'OperationHandlersUntyped',
      importType: args.typed ? 'OperationHandlers' : 'OperationHandlersUntyped',
    },
    {
      path: args.securityPath,
      handlers: args.securityHandlers,
      exportName: 'securityHandlers',
      typeName: 'SecurityHandlers',
      importType: 'SecurityHandlers',
    },
  ].sort(handlersSort);

  let imports: string[] = [];
  const typeImports: Set<string> = new Set();
  const exports: string[] = [];

  for (const { path: handlerPath, handlers, exportName, typeName, importType } of organizedHandlers) {
    if (!handlerPath || !handlers) {
      continue;
    }

    imports = imports.concat(
      generateHandlerImports({
        handlers,
        path: handlerPath,
        servicePath: args.servicePath,
        importExtension: args.importExtension,
      }),
    );

    typeImports.add(importType);
    exports.push(
      `export const ${exportName}: ${typeName} = {
${handlers.map((h) => `  '${h.operationId}': ${camelCase(h.operationId)}`).join(',\n')},
};`,
    );
  }

  if (typeImports.size > 0) {
    imports.unshift(`import type { ${Array.from(typeImports).join(', ')} } from 'fastify-openapi-connector';`);
  }

  if (args.typed) {
    const relativeSchemaPath = getRelativeSchemaFilePath(args.servicePath, args.schemaFile, args.importExtension);
    imports.push(`import type { operations } from '${relativeSchemaPath}';`);
  }

  serviceTs += `${imports.join('\n')}\n\n`;
  serviceTs += exports.join('\n\n');
  serviceTs += '\n';

  writeFileSync(args.servicePath, serviceTs);
};
