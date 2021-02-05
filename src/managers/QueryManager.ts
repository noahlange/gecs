import type { Container } from '../lib/Container';
import { difference, intersection } from '../utils';
import type { ContainerManager, Mutations } from './ContainerManager';

export interface QueryOptions {
  typeID: string | null;
  ids: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  tagIncludes: string[] | null;
  tagExcludes: string[] | null;
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

  protected filterMutations(
    ids: Set<string>,
    options: QueryOptions
  ): Set<string> {
    const yielded: Set<string> = new Set();
    for (const key in this.manager.mutations) {
      const types = options[key as keyof Mutations];
      if (!types) {
        continue;
      }
      const containers = this.manager.mutations[key as keyof Mutations];
      search: for (const id of ids) {
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
    return yielded;
  }

  protected filterContaineds(
    ids: Set<string>,
    options: QueryOptions
  ): Set<string> {
    const results = new Set<string>();
    const includes = options.includes;
    const excludes = options.excludes;

    search: for (const id of ids) {
      const bindings = this.manager.bindings[id];
      if (!bindings) {
        continue search;
      }
      if (includes) {
        for (const i of includes) {
          if (!(i in bindings)) {
            continue search;
          }
        }
      }
      if (excludes) {
        for (const e of excludes) {
          if (e in bindings) {
            continue search;
          }
        }
      }

      results.add(id);
    }

    return results;
  }

  protected filterTags(ids: Set<string>, options: QueryOptions): Set<string> {
    const byTag = this.manager.byTag;
    const includes = options.tagIncludes;
    const excludes = options.tagExcludes;

    if (includes) {
      // we always want to start by filtering includes
      for (const include of includes) {
        if (include in byTag) {
          ids = intersection(ids, byTag[include]);
          if (!ids.size) {
            return ids;
          }
        }
      }
    }

    if (excludes) {
      for (const exclude of excludes) {
        if (exclude in byTag) {
          ids = difference(ids, byTag[exclude]);
          if (!ids.size) {
            return ids;
          }
        }
      }
    }

    return ids;
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

    const queryTags = !!(options.tagIncludes || options.tagExcludes);

    if (cacheHit && !queryMutations && !queryTags) {
      for (const id of cacheHit) {
        yield this.manager.containers[id];
      }
      return;
    }

    const ids = new Set(
      (() => {
        if (options.ids) {
          return options.ids;
        }
        if (options.typeID) {
          return this.manager.byContainerType[options.typeID];
        }
        if (cacheHit) {
          return cacheHit;
        }
        return this.manager.ids;
      })()
    );

    let results: Set<string> = cacheHit ?? new Set();

    if (!cacheHit) {
      results = this.filterContaineds(ids, options);
    }

    if (!options.ids) {
      this.cache[cacheKey] = results;
    }

    if (queryTags) {
      results = this.filterTags(ids, options);
    }

    if (queryMutations) {
      results = this.filterMutations(ids, options);
    }

    for (const id of results) {
      yield this.manager.containers[id];
    }
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
