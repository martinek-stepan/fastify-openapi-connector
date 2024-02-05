import type { FastifyInstance } from 'fastify';
import type { Options, ServerObject } from './types.js';

export const determinePrefix = (instance: FastifyInstance, settings: Options['settings'], servers?: ServerObject[]): string | undefined => {
  if (typeof settings?.prefix === 'string') {
    return settings.prefix;
  }

  let prefix: string | undefined;
  if (settings?.prefix) {
    const { urlRegex, descriptionRegex, prefixVariable } = settings.prefix;

    const server = servers?.find((server) => {
      if (urlRegex && server.url && urlRegex.test(server.url)) {
        return true;
      }

      if (descriptionRegex && server.description && descriptionRegex.test(server.description)) {
        return true;
      }

      return false;
    });

    if (server) {
      prefix = prefixVariable ? server.variables?.[prefixVariable]?.default : server.url?.split('/').pop();
    }

    if (prefix && !prefix.startsWith('/')) {
      prefix = `/${prefix}`;
    }

    if (!prefix) {
      instance.log.warn('Prefix could not be determined from servers. There will be no prefix for routes.');
    }
  }

  return prefix;
};
