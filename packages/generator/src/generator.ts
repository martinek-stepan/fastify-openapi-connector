import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { glob } from 'glob';

export interface PathsObject {
  // biome-ignore lint/suspicious/noExplicitAny: It can be any
  [method: string]: any;
}

export interface OpenAPISpec {
  components?: {
    securitySchemes?: Record<string, unknown>;
  };
  paths?: PathsObject;
  webhooks?: PathsObject;
}

export type TemplateFunction = (imp: string, typesPath: string) => string;

export const routeTemplateTyped: TemplateFunction = (
  imp: string,
  typesPath: string,
) => `import { TypedHandler, TypedResponse } from '${typesPath}';

export const ${imp}: TypedHandler<'${imp}'> = async (req, reply): TypedResponse<'${imp}'> => {
  return reply.code(501).send("Not Implemented");
}
`;

export const routeTemplateUntyped: TemplateFunction = (imp: string, _: string) => `import { FastifyReply, FastifyRequest } from 'fastify';

export const ${imp} = (req: FastifyRequest, reply: FastifyReply): any => {
  return reply.code(501).send("Not Implemented");
}
`;

export const securityTemplate = (name: string) => `import { FastifyRequest } from 'fastify';
  
export const ${name} = (req: FastifyRequest, scopes?: string[]): boolean | Promise<boolean> => {
  return false;
}
`;

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
}) => {
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

export const generateHandlerFiles = async (args: {
  handlerNames: string[];
  path: string;
  typesPath: string;
  templateFunction: TemplateFunction;
}) => {
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

    for (const imp of missingImplementations) {
      writeFileSync(path.join(args.path, `${imp}.ts`), args.templateFunction(imp, relative));
    }
  }
};

export const generateHandlerImports = (args: { handlerNames: string[]; path: string; servicePath: string }) => {
  return args.handlerNames.map((name) => {
    const handlerPath = path.relative(path.resolve(args.servicePath, '..'), path.resolve(args.path));
    const importPath = path
      .join(handlerPath, `${name}.js'`)
      .replace(/\\/g, '/')
      .replace(/^(?!\.\.?\/)/, './');
    return `import { ${name} } from '${importPath};`;
  });
};

export interface OrganizedHandlers {
  path?: string;
  handlers?: string[];
  exportName: string;
  typeName: string;
}

export const handlersSort = (a: OrganizedHandlers, b: OrganizedHandlers) => {
  if (!a.path) {
    return -1;
  }

  if (!b.path) {
    return 1;
  }

  return a.path > b.path ? 1 : b.path > a.path ? -1 : 0;
};

export const generateTypesFile = (typesFilePath: string, schemaPath: string, overrideTypesFile: boolean) => {
  if (existsSync(typesFilePath) && !overrideTypesFile) {
    console.log('Types file already exists. Skipping generation.');
    return;
  }

  const relative = path
    .relative(path.resolve(typesFilePath, '..'), path.resolve(schemaPath.replace(/.ts$/, '.js')))
    .replace(/\\/g, '/')
    .replace(/^(?!\.\.?\/)/, './');
  const content = `import type { TypedRequestBase, TypedHandlerBase, TypedResponseBaseSync, TypedResponseBaseAsync} from 'fastify-openapi-connector';
import type { operations } from '${relative}';

export type TypedRequest<T extends keyof operations> = TypedRequestBase<operations, T>;  
export type TypedResponse<T extends keyof operations> = TypedResponseBaseSync<operations, T>;
export type TypedResponseAsync<T extends keyof operations> = TypedResponseBaseAsync<operations, T>;
export type TypedHandler<T extends keyof operations> = TypedHandlerBase<operations, T>;
`;

  writeFileSync(typesFilePath, content);
};

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
${handlers.map((name) => `  ${name}`).join(',\n')},
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
