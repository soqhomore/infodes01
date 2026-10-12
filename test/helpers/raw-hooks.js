// Custom loader hooks: resolve Vite ?raw imports as empty-string modules.

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('?raw')) {
    const clean = specifier.slice(0, -4);
    const resolved = await nextResolve(clean, context);
    return { ...resolved, url: resolved.url + '?raw' };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('?raw')) {
    return { format: 'module', source: 'export default "";', shortCircuit: true };
  }
  return nextLoad(url, context);
}
