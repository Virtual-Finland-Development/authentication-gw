type StorageDrivers = {
  [key: string]: "variableStorage" | "localStorage" | "sessionStorage";
};

export default class SimpleJSONStore {
  storeKey: string;
  drivers: StorageDrivers = {};
  constructor(storeKey: string, drivers?: StorageDrivers) {
    this.storeKey = storeKey;
    if (drivers) {
      this.drivers = drivers;
    }
  }

  get(key?: string) {
    const storage = this.#getDriverForKey(key);
    let store = storage.getItem(this.storeKey);
    if (!store) {
      store = "{}";
    }
    const storeObj = JSON.parse(store);

    if (typeof key === "string") {
      return storeObj[key];
    }
    return storeObj;
  }
  set(key: string, value: any) {
    const storage = this.#getDriverForKey(key);
    const store = this.get();
    store[key] = value;
    storage.setItem(this.storeKey, JSON.stringify(store));
  }
  clear(key?: string) {
    const storage = this.#getDriverForKey(key);

    if (typeof key === "string") {
      const store = this.get();
      delete store[key];
      if (Object.keys(store).length === 0) {
        storage.removeItem(this.storeKey);
      } else {
        storage.setItem(this.storeKey, JSON.stringify(store));
      }
    } else {
      storage.removeItem(this.storeKey);
    }
  }
  has(key?: string) {
    const store = this.get();

    if (typeof key === "string") {
      return store.hasOwnProperty(key);
    }
    return Object.keys(store).length > 0;
  }

  #getDriverForKey(key: string) {
    const driverName = this.#getDriverNameForKey(key);
    if (driverName === "variableStorage") {
      return VariableStorage;
    }
    if (typeof window[driverName] === "undefined") {
      throw new Error(`Driver ${driverName} not found`);
    }
    return window[driverName];
  }

  #getDriverNameForKey(key: string) {
    if (this.drivers.hasOwnProperty(key)) {
      return this.drivers[key];
    }
    return "localStorage";
  }
}

const VariableStorage = {
  store: {},
  getItem(key: string) {
    return this.store[key];
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
};
