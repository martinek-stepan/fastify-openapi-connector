import { Options, ServerObject } from './types.js';

export const determinePrefix = (settings: Options['settings'], servers?: ServerObject[]): string | undefined => {
  let prefix: string | undefined = settings?.prefix;

  if (!prefix && settings?.extractPrefixFromServers) {
    const { urlRegex, descriptionRegex, prefixVariable } = settings.extractPrefixFromServers;

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
  }

  return prefix;
};
