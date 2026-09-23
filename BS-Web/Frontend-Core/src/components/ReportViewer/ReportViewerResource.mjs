export const getReportFilterResourceKeys = (filter) => ({
  group: filter.resourceGroup || filter.resource_group || filter.reportCode,
  name:
    filter.resourceName ||
    filter.resource_name ||
    filter.parameterName ||
    filter.parameter_name,
});

export const resolveResourceText = (
  group,
  name,
  fallback,
  lang,
  getResourceByGroupAndName,
) => {
  const resource = getResourceByGroupAndName(group, name, lang);
  return resource?.resource_value && resource.resource_value !== name
    ? resource.resource_value
    : fallback;
};

export const resolveReportFilterText = (
  filter,
  lang,
  getResourceByGroupAndName,
) => {
  const { group, name } = getReportFilterResourceKeys(filter);
  const resource =
    group && name ? getResourceByGroupAndName(group, name, lang) : null;
  const resourceValue = resource?.resource_value;
  const resourceDescription = resource?.resource_description;

  return {
    label:
      resourceValue && resourceValue !== name
        ? resourceValue
        : filter.label || name,
    placeholder:
      resourceDescription && resourceDescription !== name
        ? resourceDescription
        : filter.placeholder || filter.label || name,
  };
};

export const resolveReportViewerLocale = (
  localeText,
  lang,
  getResourceByGroupAndName,
) =>
  Object.fromEntries(
    Object.entries(localeText).map(([name, fallback]) => [
      name,
      resolveResourceText(
        "ReportViewer",
        name,
        fallback,
        lang,
        getResourceByGroupAndName,
      ),
    ]),
  );
