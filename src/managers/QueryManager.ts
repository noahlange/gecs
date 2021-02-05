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
  protected cache: Record<string, string[]> = {};
  protected manager: ContainerManager;

  /**
   * Remove a specific ID from the queries in which it appears.
   */
  public invalidateEntity(id: string): void {
    for (const key in this.cache) {
      if (this.cache[key].includes(id)) {
        this.cache[key] = this.cache[key].filter(i => i !== id);
      }
    }
  }

  /**
   * Naïve cache-busting implementation.
   */
  public invalidateTypes(types: string[]): void {
    const toClear = Object.keys(this.cache).filter(q =>
      types.some(t => q.includes(t))
    );
    for (const q of toClear) {
      delete this.cache[q];
    }
  }

  protected filterMutations(ids: string[], options: QueryOptions): string[] {
    const allMutations = this.manager.mutations;
    const allBindings = this.manager.bindings;
    const results: string[] = [];

    mutations: for (const key in allMutations) {
      const types = options[key as keyof Mutations];
      if (!types.length) {
        continue mutations;
      }
      const containers = allMutations[key as keyof Mutations];
      search: for (const id of ids) {
        if (id in containers && results.indexOf(id) === -1) {
          const mutations = containers[id] ?? [];
          if (mutations.length) {
            const bindings = allBindings[id];
            // if anything comes back changed, we'll bail and call it good
            for (const type of types) {
              if (mutations.indexOf(bindings[type]) > -1) {
                results.push(id);
                continue search;
              }
            }
          }
        }
      }
    }
    return results;
  }

  protected filterContaineds(ids: string[], options: QueryOptions): string[] {
    const results: string[] = [];
    const allBindings = this.manager.bindings;

    search: for (const id of ids) {
      if (!(id in allBindings)) {
        continue search;
      }

      const bindings = allBindings[id];

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
    let res: string[] = [];
    const byTag = this.manager.byTag;

    // we always want to start by filtering includes
    for (const include of options.tagIncludes) {
      if (include in byTag) {
        res = intersection(ids, byTag[include]);
        if (!res.length) {
          return Array.from(res);
        }
      }
    }

    for (const exclude of options.tagExcludes) {
      if (exclude in byTag) {
        res = difference(ids, byTag[exclude]);
        if (!res.length) {
          return Array.from(res);
        }
      }
    }

    return Array.from(res);
  }

  public getCacheKey(options: QueryOptions): string | null {
    if (options.includes || options.excludes) {
      return JSON.stringify([
        options.includes.sort((a, b) => a.localeCompare(b)),
        options.excludes.sort((a, b) => a.localeCompare(b))
      ]);
    }
    return null;
  }

  public query(options: QueryOptions): Container[] {
    const cacheKey = this.getCacheKey(options);
    const cachedItems = cacheKey ? this.cache[cacheKey] : null;
    const containers = this.manager.containers;

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
          : null) ??
        cachedItems ??
        Object.keys(containers);

    if (cachedItems && options.ids.length) {
      ids = ids.filter(id => cachedItems.indexOf(id) > -1);
    }

    if (!cachedItems) {
      ids = this.filterContaineds(ids, options);
      if (!options.ids.length && cacheKey) {
        this.cache[cacheKey] = ids.slice();
      }
    }

    if (queryTags) {
      ids = this.filterTags(ids, options);
    }
    if (queryMutations) {
      ids = this.filterMutations(ids, options);
    }

    return ids.map(id => containers[id]);
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
