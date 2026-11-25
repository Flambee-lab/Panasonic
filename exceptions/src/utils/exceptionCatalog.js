function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function exceptionIdentity(item) {
  if (!item.sharedId && item.id) return `exception:${item.id}`;
  const { id, sharedName, sharedDetail, applies, status, ...definition } = item;
  return JSON.stringify(stableValue(definition));
}

export function buildExceptionCatalog(availableItems, selectedItems = []) {
  const catalog = new Map();
  for (const item of [...availableItems, ...selectedItems]) {
    const key = exceptionIdentity(item);
    catalog.set(key, { ...item, id: item.id ?? key });
  }
  return [...catalog.values()];
}
