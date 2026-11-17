export function getEnv(name: string, fallbackKey?: string): string {
  // 1. Vite import.meta.env (takes precedence)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const viteKey = `VITE_${name}`;
    const val = import.meta.env[viteKey];
    if (val !== undefined && val !== "") return val;

    if (fallbackKey) {
      const fbVal = import.meta.env[fallbackKey];
      if (fbVal !== undefined && fbVal !== "") return fbVal;
    }
  }

  // 2. process.env (Node / Bun / SSR fallback)
  if (typeof process !== "undefined" && process.env) {
    const viteKey = `VITE_${name}`;
    const procVite = process.env[viteKey];
    if (procVite !== undefined && procVite !== "") return procVite;

    const nextKey = `NEXT_PUBLIC_${name}`;
    const procNext = process.env[nextKey];
    if (procNext !== undefined && procNext !== "") return procNext;

    if (fallbackKey) {
      const procFallback = process.env[fallbackKey];
      if (procFallback !== undefined && procFallback !== "") return procFallback;
    }
  }

  return "";
}
