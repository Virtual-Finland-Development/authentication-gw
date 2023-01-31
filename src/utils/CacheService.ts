import { deleteDynamoDBItem, putDynamoDBItem, scanForDynamoDBItems } from "./libs/AWS/DynamoDB";
import { debug } from "./logging";
import Settings from "./Settings";

function getTableName(): string {
  const tableName = Settings.getEnv("DYNAMODB_CACHE_TABLE_NAME");
  if (!tableName) {
    throw new Error("DYNAMODB_CACHE_TABLE_NAME is not defined");
  }
  return tableName;
}

function getCacheKey(key: string) {
  return `cache::${key.toLowerCase()}`;
}

type CacheItem = {
  CacheKey: string;
  CacheValue: string;
  UpdatedAt: number;
  TimeToLive: number | null;
};

function generateCacheItem(key: string, value: any, ttlMs?: number): CacheItem {
  return {
    CacheKey: getCacheKey(key),
    CacheValue: JSON.stringify(value),
    UpdatedAt: new Date().getTime(),
    TimeToLive: ttlMs ? new Date(Date.now() + ttlMs).getTime() : null,
  };
}

function parseCacheItemValue(cacheItem: CacheItem | undefined): any {
  if (cacheItem) {
    const value = JSON.parse(cacheItem.CacheValue);
    return value;
  }
  return undefined;
}

/**
 * Simple in-memory cache service snub
 */
const LocalCache = {
  store: new Map<string, CacheItem>(),
  get(cacheKey: string) {
    const value = this.store.get(cacheKey);
    if (value && value.TimeToLive && value.TimeToLive < new Date().getTime()) {
      this.delete(cacheKey);
      return undefined;
    }
    return value;
  },
  set(value: CacheItem) {
    this.store.set(value.CacheKey, value);
  },
  has(cacheKey: string) {
    return this.store.has(cacheKey);
  },
  delete(cacheKey: string) {
    this.store.delete(cacheKey);
  },
};

/**
 * Dynamodb cache service
 */
const RemoteCache = {
  async get(cacheKey: string): Promise<CacheItem | undefined> {
    const tableName = getTableName();
    const expressionStatement = "CacheKey = :cacheKey AND (attribute_not_exists(TimeToLive) OR TimeToLive = :neverExpires OR TimeToLive > :now)";
    const expressionAttributeValues = {
      ":cacheKey": cacheKey,
      ":now": new Date().getTime(),
      ":neverExpires": null,
    };

    const items = await scanForDynamoDBItems(tableName, expressionStatement, expressionAttributeValues, 1);
    if (items.length > 0) {
      const item = items[0];
      const value = JSON.parse(item.CacheValue);
      return value;
    }
    return undefined;
  },
  async set(cacheItem: CacheItem) {
    const tableName = getTableName();
    await putDynamoDBItem(tableName, cacheItem);
  },
  async delete(cacheKey: string) {
    const tableName = getTableName();
    await deleteDynamoDBItem(tableName, cacheKey);
  },
};

function shouldUseRemoteCache(): boolean {
  // Skip store on test and local environment
  return Settings.getEnv("NODE_ENV") !== "test" && Settings.getStage() !== "local";
}

/**
 *
 * @param key
 * @returns
 */
async function getFromCache(key: string): Promise<any> {
  try {
    const cacheKey = getCacheKey(key);
    if (LocalCache.has(cacheKey)) {
      return parseCacheItemValue(LocalCache.get(cacheKey)); // Expires in instance lifetime
    }

    if (!shouldUseRemoteCache()) {
      return undefined;
    }

    const remoteValue = await RemoteCache.get(cacheKey);
    if (remoteValue) {
      LocalCache.set(remoteValue);
    }
    return parseCacheItemValue(remoteValue);
  } catch (error) {
    debug("CacheService.getFromCache", error);
  }
}

/**
 *
 * @param key
 * @param value
 * @param ttlMs - Time to live in milliseconds
 */
async function saveToCache(key: string, value: any, ttlMs?: number) {
  try {
    const cacheItem = generateCacheItem(key, value, ttlMs);
    LocalCache.set(cacheItem);
    if (shouldUseRemoteCache()) {
      await RemoteCache.set(cacheItem);
    }
  } catch (error) {
    debug("CacheService.saveToCache", error);
  }
}

/**
 *
 * @param key
 */
async function removeFromCache(key: string) {
  try {
    const cacheKey = getCacheKey(key);
    LocalCache.delete(cacheKey);
    if (shouldUseRemoteCache()) {
      await RemoteCache.delete(cacheKey);
    }
  } catch (error) {
    debug("CacheService.removeFromCache", error);
  }
}

export default {
  fetch: getFromCache,
  save: saveToCache,
  remove: removeFromCache,
};
