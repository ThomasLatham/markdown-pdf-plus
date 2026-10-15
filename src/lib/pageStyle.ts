export interface PageSettings {
  pageSize: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

/**
 * Builds an `@page` rule from the extension's page settings. Empty settings are omitted so that
 * they fall back to whatever the document's own CSS (or the browser default) says.
 */
export const buildPageRule = (settings: PageSettings): string => {
  const declarations = [
    ["size", settings.pageSize],
    ["margin-top", settings.marginTop],
    ["margin-right", settings.marginRight],
    ["margin-bottom", settings.marginBottom],
    ["margin-left", settings.marginLeft],
  ]
    .map(([property, value]) => [property, value.trim().replace(/[;{}]/g, "")])
    .filter(([, value]) => value)
    .map(([property, value]) => `${property}: ${value};`);

  return declarations.length ? `@page { ${declarations.join(" ")} }` : "";
};
