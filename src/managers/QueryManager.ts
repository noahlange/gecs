import type { Container } from '../lib/Container';
import { difference, intersection } from '../utils';
import type { ContainerManager, Mutations } from './ContainerManager';

export interface QueryOptions {
  typeID: string | null;
  ids: string[];
  includes: string[];
  excludes: string[];
  tagIncludes: string[];
  tagExcludes: string[];
  created: string[];
  changed: string[];
  removed: string[];
}
/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected cache: Record<string, Record<string, boolean>> = {};
  protected manager: ContainerManager;

  /**
   * Remove a specific ID from the queries in which it appears.
   */
  public invalidateEntity(id: string): void {
    for (const q in this.cache) {
      const set = this.cache[q];
      if (id in set) {
        delete set[id];
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

  protected filterMutations(ids: string[], options: QueryOptions): string[] {
    const muts = this.manager.mutations;
    const results: Record<string, boolean> = {};

    mutations: for (const key in muts) {
      const types = this.sortTypes(options[key as keyof Mutations] ?? []);
      if (!types.length) {
        continue mutations;
      }
      const containers = muts[key as keyof Mutations];
      search: for (const id of ids) {
        if (id in containers && !(id in results)) {
          const mutations = containers[id];
          if (mutations.size) {
            const bindings = this.manager.bindings[id];
            // if something comes back changed, we're calling it good.
            for (const type of types) {
              if (mutations.has(bindings[type])) {
                results[id] = true;
                continue search;
              }
            }
          }
        }
      }
    }
    return Object.keys(results);
  }

  protected filterContaineds(ids: string[], options: QueryOptions): string[] {
    const results: string[] = [];

    search: for (const id of ids) {
      if (!(id in this.manager.bindings)) {
        continue search;
      }

      const bindings = this.manager.bindings[id];

      for (const i of options.includes) {
        if (!(i in bindings)) {
          continue search;
        }
      }

      for (const e of options.excludes) {
        if (e in bindings) {
          continue search;
        }
      }

      results.push(id);
    }

    return results;
  }

  protected filterTags(ids: string[], options: QueryOptions): string[] {
    let res = new Set<string>(ids);
    const byTag = this.manager.byTag;

    // we always want to start by filtering includes
    for (const include of options.tagIncludes) {
      if (include in byTag) {
        res = intersection(ids, byTag[include]);
        if (!res.size) {
          return Array.from(res);
        }
      }
    }

    for (const exclude of options.tagExcludes) {
      if (exclude in byTag) {
        res = difference(ids, byTag[exclude]);
        if (!res.size) {
          return Array.from(res);
        }
      }
    }

    return Array.from(res);
  }

  public getCacheKey(options: QueryOptions): string | null {
    if (options.includes || options.excludes) {
      return JSON.stringify([options.includes, options.excludes]);
    }
    return null;
  }

  public sortTypes(types: string[], descending: boolean = false): string[] {
    return types.sort(
      descending
        ? (a, b) => this.manager.typeCounts[b] - this.manager.typeCounts[a]
        : (a, b) => this.manager.typeCounts[a] - this.manager.typeCounts[b]
    );
  }

  public query(options: QueryOptions): Container[] {
    const cacheKey = this.getCacheKey(options);
    const cacheHit = cacheKey ? this.cache[cacheKey] : null;

    const queryMutations = !!(
      options.changed.length ||
      options.removed.length ||
      options.created.length
    );

    const queryTags = !!(
      options.tagIncludes.length || options.tagExcludes.length
    );

    let ids: string[] = options.ids?.length
      ? options.ids
      : (options.typeID
          ? this.manager.byContainerType[options.typeID]
          : null) ?? this.manager.ids;

    if (!cacheHit) {
      options.includes = this.sortTypes(options.includes);
      options.excludes = this.sortTypes(options.excludes, true);

      ids = this.filterContaineds(ids, options);
      if (!options.ids && cacheKey) {
        this.cache[cacheKey] = ids.reduce((a, b) => ({ ...a, [b]: true }), {});
      }
    }

    if (queryTags) {
      ids = this.filterTags(ids, options);
    }

    if (queryMutations) {
      ids = this.filterMutations(ids, options);
    }

    const containers = this.manager.containers;
    return ids.map(id => containers[id]);
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
