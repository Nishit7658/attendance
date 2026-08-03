import { prisma } from "@/lib/prisma";

let configCache: Record<string, string> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export async function getSystemConfigs(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && configCache && now - lastFetchTime < CACHE_TTL) {
    return configCache;
  }

  const configs = await prisma.systemConfig.findMany();
  const newCache: Record<string, string> = {};
  for (const c of configs) {
    newCache[c.key] = c.value;
  }

  configCache = newCache;
  lastFetchTime = now;
  return newCache;
}

export async function getSystemConfig(key: string, defaultValue: string = ""): Promise<string> {
  const configs = await getSystemConfigs();
  return configs[key] ?? defaultValue;
}

export async function getSystemConfigNumber(key: string, defaultValue: number): Promise<number> {
  const configs = await getSystemConfigs();
  const val = configs[key];
  if (!val) return defaultValue;
  const num = parseInt(val, 10);
  return isNaN(num) ? defaultValue : num;
}

export async function getSystemConfigBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const configs = await getSystemConfigs();
  const val = configs[key];
  if (!val) return defaultValue;
  return val === "true";
}
