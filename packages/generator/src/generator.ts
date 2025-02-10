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
}): Promise<string[]> => {
  const operationIds: string[] = [];

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

      operationIds.push(operationId);
    }
  }

  await generateHandlerFiles({
    handlerNames: operationIds,
    path: args.filesPath,
    typesPath: args.typesPath.replace(/.ts$/, '.js').replace(/^(?!\.\.?\/)/, './'),
    templateFunction: args.typed ? routeTemplateTyped : routeTemplateUntyped,
  });
  return operationIds;
};

/**
 * Function to generate security files
 * @param args setup arguments
 * @returns security hander names
 */
export const parseAndGenerateSecurity = async (args: {
  security: Record<string, unknown>;
  filesPath: string;
}): Promise<string[]> => {
  const securityNames: string[] = [];

  for (const security of Object.keys(args.security)) {
    if (security.startsWith('x-')) {
      continue;
    }

    securityNames.push(security);
  }

  await generateHandlerFiles({
    handlerNames: securityNames,
    path: args.filesPath,
    typesPath: '',
    templateFunction: securityTemplate,
  });

  return securityNames;
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
}): Promise<void> => {
  let pathOperationIds: string[] | undefined;
  let webhookOperationIds: string[] | undefined;
  let securityNames: string[] | undefined;

  if (args.spec.paths && args.routesPath) {
    pathOperationIds = await parseAndGenerateOperationHandlers({
      filesPath: args.routesPath,
      typesPath: args.typesPath,
      paths: args.spec.paths,
      typed: args.typed,
    });
  }

  if (args.spec.webhooks && args.webhooksPath) {
    webhookOperationIds = await parseAndGenerateOperationHandlers({
      filesPath: args.webhooksPath,
      typesPath: args.typesPath,
      paths: args.spec.webhooks,
      typed: args.typed,
    });
  }

  if (args.spec.components?.securitySchemes && args.securityPath) {
    securityNames = await parseAndGenerateSecurity({
      filesPath: args.securityPath,
      security: args.spec.components.securitySchemes,
    });
  }

  generateTypesFile(args.typesPath, args.schemaFilePath, args.overrideTypesFile);
  generateServiceFile({
    servicePath: args.servicePath,
    pathHandlerNames: pathOperationIds,
    webhookHandlerNames: webhookOperationIds,
    securityHandlerNames: securityNames,
    routesPath: args.routesPath,
    webhooksPath: args.webhooksPath,
    securityPath: args.securityPath,
  });
  console.log('DONE!');
};

/**
 * Function to generate handler files
 * @param args setup arguments
 */
export const generateHandlerFiles = async (args: {
  handlerNames: string[];
  path: string;
  typesPath: string;
  templateFunction: TemplateFunction;
}): Promise<void> => {
  if (!existsSync(args.path)) {
    mkdirSync(args.path, { recursive: true });
  }

  const files: string[] = (
    await glob(path.resolve(args.path, '*.ts'), {
      windowsPathsNoEscape: true,
    })
  ).map((file) => path.basename(file, '.ts'));

  // All operation ids must have an implementation
  const missingImplementations = args.handlerNames.filter((name) => !files.includes(name));

  if (missingImplementations.length) {
    console.log('These operations are missing an implementation:');
    console.log(missingImplementations);

    const relative = path.relative(path.resolve(args.path), path.resolve(args.typesPath)).replace(/\\/g, '/');

    for (const operationId of missingImplementations) {
      writeFileSync(path.join(args.path, `${operationId}.ts`), args.templateFunction(camelCase(operationId), operationId, relative));
    }
  }
};

/**
 * Function to generate handler imports
 * @param args setup arguments
 * @returns handler imports
 */
export const generateHandlerImports = (args: { handlerNames: string[]; path: string; servicePath: string }): string[] => {
  return args.handlerNames.map((name) => {
    const handlerPath = path.relative(path.resolve(args.servicePath, '..'), path.resolve(args.path));
    const importPath = path
      .join(handlerPath, `${name}.js'`)
      .replace(/\\/g, '/')
      .replace(/^(?!\.\.?\/)/, './');
    return `import { ${camelCase(name)} } from '${importPath};`;
  });
};

/**
 * Helper interface for sorting handlers
 */
export interface OrganizedHandlers {
  path?: string;
  handlers?: string[];
  exportName: string;
  typeName: string;
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
 * Generets types file
 * @param typesFilePath Path where to generate
 * @param schemaPath  Path to schema file
 * @param overrideTypesFile Indicates that types file should be overrided if exists
 * @returns
 */
export const generateTypesFile = (typesFilePath: string, schemaPath: string, overrideTypesFile: boolean): void => {
  if (existsSync(typesFilePath) && !overrideTypesFile) {
    console.log('Types file already exists. Skipping generation.');
    return;
  }

  const relative = schemaPath.startsWith('@')
    ? schemaPath
    : path
        .relative(path.resolve(typesFilePath, '..'), path.resolve(schemaPath.replace(/.ts$/, '.js')))
        .replace(/\\/g, '/')
        .replace(/^(?!\.\.?\/)/, './');
  const content = `import type { TypedRequestBase, TypedHandlerBase, TypedResponseBase, TypedResponseBaseSync, TypedResponseBaseAsync} from 'fastify-openapi-connector';
import type { operations } from '${relative}';

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
  pathHandlerNames?: string[];
  webhookHandlerNames?: string[];
  securityHandlerNames?: string[];
  routesPath?: string;
  webhooksPath?: string;
  securityPath?: string;
  servicePath: string;
}) => {
  let serviceTs = '// THIS FILE IS AUTO GENERATED - DO NOT MANUALLY ALTER!!\n';

  const organizedHandlers: OrganizedHandlers[] = [
    {
      path: args.routesPath,
      handlers: args.pathHandlerNames,
      exportName: 'pathHandlers',
      typeName: 'OperationHandlers',
    },
    {
      path: args.webhooksPath,
      handlers: args.webhookHandlerNames,
      exportName: 'webhookHandlers',
      typeName: 'OperationHandlers',
    },
    {
      path: args.securityPath,
      handlers: args.securityHandlerNames,
      exportName: 'securityHandlers',
      typeName: 'SecurityHandlers',
    },
  ].sort(handlersSort);

  let imports: string[] = [];
  const typeImports: Set<string> = new Set();
  const exports: string[] = [];

  for (const { path, handlers, exportName, typeName } of organizedHandlers) {
    if (!path || !handlers) {
      continue;
    }

    imports = imports.concat(
      generateHandlerImports({
        handlerNames: handlers,
        path: path,
        servicePath: args.servicePath,
      }),
    );

    typeImports.add(typeName);
    exports.push(
      `export const ${exportName}: ${typeName} = {
${handlers.map((name) => `  '${name}': ${camelCase(name)}`).join(',\n')},
};`,
    );
  }

  if (typeImports.size > 0) {
    imports.unshift(`import type { ${Array.from(typeImports).join(', ')} } from 'fastify-openapi-connector';`);
  }

  serviceTs += `${imports.join('\n')}\n\n`;
  serviceTs += exports.join('\n\n');
  serviceTs += '\n';

  writeFileSync(args.servicePath, serviceTs);
};
