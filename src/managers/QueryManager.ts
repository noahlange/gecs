import type { Container } from '../lib/Container';
import type { ContainerManager, Mutations } from './ContainerManager';

export interface QueryOptions {
  typeID: string | null;
  ids: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  created: string[] | null;
  changed: string[] | null;
  removed: string[] | null;
}

/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected cache: Record<string, Set<string> | null> = {};
  protected manager: ContainerManager;

  /**
   * Remove a specific ID from the queries in which it appears.
   */
  public invalidateEntity(id: string): void {
    for (const q in this.cache) {
      const set = this.cache[q];
      if (set?.has(id)) {
        set.delete(id);
      }
    }
  }

  /**
   * Naïve cache-busting implementation.
   */
  public invalidateType(type: string): void {
    for (const q in this.cache) {
      if (q.includes(type)) {
        delete this.cache[q];
      }
    }
  }

  public *query(options: QueryOptions): IterableIterator<Container> {
    const cacheKey = JSON.stringify([options.includes, options.excludes]);
    const cacheHit =
      options.ids || options.typeID ? null : this.cache[cacheKey];

    const queryMutations = !!(
      options.changed ||
      options.removed ||
      options.created
    );

    if (cacheHit && !queryMutations) {
      for (const id of cacheHit) {
        yield this.manager.containers[id];
      }
      return;
    }

    // in order of priority:
    const ids =
      // specifically-requested ids
      options.ids ??
      // ids of type-constrained entities
      (options.typeID ? this.manager.byContainerType[options.typeID] : null) ??
      // results from a cache hit
      cacheHit ??
      // every entity
      this.manager.ids;

    const includes = options.includes ?? [];
    const excludes = options.excludes ?? [];
    let results: Set<string> = cacheHit ?? new Set();

    if (!cacheHit) {
      search: for (const id of ids) {
        const bindings = this.manager.bindings[id];

        if (!bindings) {
          continue search;
        }

        for (const i of includes) {
          if (!(i in bindings)) {
            continue search;
          }
        }

        for (const e of excludes) {
          if (e in bindings) {
            continue search;
          }
        }

        results.add(id);
      }
    }

    if (!options.ids) {
      this.cache[cacheKey] = results;
    }

    if (queryMutations) {
      const yielded: Set<string> = new Set();
      for (const key in this.manager.mutations) {
        const types = options[key as keyof Mutations];
        if (!types) {
          continue;
        }

        const containers = this.manager.mutations[key as keyof Mutations];
        search: for (const id of results) {
          if (id in containers && !yielded.has(id)) {
            const mutations = containers[id];
            if (mutations.size) {
              const bindings = this.manager.bindings[id];
              for (const type of types) {
                if (mutations.has(bindings[type])) {
                  yielded.add(id);
                  continue search;
                }
              }
            }
          }
        }
      }
      results = yielded;
    }

    for (const id of results) {
      yield this.manager.containers[id];
    }
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
