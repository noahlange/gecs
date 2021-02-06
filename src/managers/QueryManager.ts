import type { Container } from '../lib/Container';
import type { ContainerManager } from './ContainerManager';
import { Mutation } from './ContainerManager';

export enum QueryType {
  ID = 1,
  CONTAINED = 2,
  CONTAINER = 3,
  TAG = 4
}

export interface QueryState {
  type: QueryType | null;
  items: string[];
  tag: QueryTag;
  mutation: Mutation | null;
}

export enum QueryTag {
  AND = 'and',
  OR = 'or',
  NONE = 'none'
}

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

interface O {
  includesAny: any[];
  includesAll: any[];
  excludes: any[];
}

const DEFAULT = {
  includesAny: [],
  includesAll: [],
  excludes: []
};
/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected cache: Record<string, string[]> = {};
  protected manager: ContainerManager;

  protected filterIDs(
    ids: string[],
    options: { includes: string[]; excludes: string[] }
  ): string[] {
    if (options.includes.length || options.excludes.length) {
      const results = [];
      for (const id of options.includes) {
        if (ids.includes(id) && !options.excludes.includes(id)) {
          results.push(id);
        }
      }
      return results;
    } else {
      return ids;
    }
  }

  protected filterTags(ids: string[], options: O): string[] {
    const results: string[] = [];

    search: for (const id of ids) {
      const tags = this.manager.tags[id] ?? [];

      for (const e of options.excludes) {
        if (tags.includes(e)) {
          continue search;
        }
      }

      for (const i of options.includesAll) {
        if (!tags.includes(i)) {
          continue search;
        }
      }

      any: for (const i of options.includesAny) {
        if (tags.includes(i)) {
          break any;
        }
        continue search;
      }

      results.push(id);
    }

    return results;
  }

  protected filterContaineds(ids: string[], options: O): string[] {
    const results: string[] = [];
    const allBindings = this.manager.bindings;
    search: for (const id of ids) {
      if (!(id in allBindings)) {
        continue search;
      }
      const bindings = allBindings[id];
      for (const e of options.excludes) {
        if (e in bindings) {
          continue search;
        }
      }
      for (const i of options.includesAll) {
        if (!(i in bindings)) {
          continue search;
        }
      }
      any: for (const i of options.includesAny) {
        if (i in bindings) {
          break any;
        }
        continue search;
      }
      results.push(id);
    }
    return results;
  }

  protected filterMutations(
    ids: string[],
    mutation: Mutation,
    options: O
  ): string[] {
    const results: string[] = [];
    const allBindings = this.manager.bindings;
    const containers = this.manager.mutations[mutation];
    search: for (const id of ids) {
      const mutations = containers[id] ?? [];
      const bindings = allBindings[id];
      const includesAll = options.includesAll.map(t => bindings[t]);
      const includesAny = options.includesAny.map(t => bindings[t]);
      const excludes = options.excludes.map(t => bindings[t]);
      for (const e of excludes) {
        if (mutations.includes(e)) {
          continue search;
        }
      }
      for (const i of includesAll) {
        if (!mutations.includes(i)) {
          continue search;
        }
      }
      any: for (const i of includesAny) {
        if (mutations.includes(i)) {
          break any;
        }
        continue search;
      }
      results.push(id);
    }
    return results;
  }

  public *execute(criteria: QueryState[]): IterableIterator<Container> {
    const idInclude: string[] = [];
    const idExclude: string[] = [];
    const mutations = {
      created: { includes: [], excludes: [] },
      changed: { includes: [], excludes: [] },
      removed: { includes: [], excludes: [] }
    };

    let ids = Object.keys(this.manager.containers);

    for (const step of criteria) {
      if (!step.type) {
        continue;
      }

      const options: Partial<Record<QueryType, O>> = {};

      switch (step.type) {
        case QueryType.ID: {
          if (step.tag === QueryTag.NONE) {
            idExclude.push(...step.items);
          } else {
            idInclude.push(...step.items);
          }
          break;
        }
        case QueryType.CONTAINER: {
          ids = step.items.reduce((a: string[], b) => {
            return a.concat(this.manager.byContainerType[b]);
          }, []);

          mutations.changed;

          break;
        }
        case QueryType.TAG:
        case QueryType.CONTAINED: {
          const o: O = { includesAny: [], excludes: [], includesAll: [] };
          if (step.tag === QueryTag.AND) {
            o.includesAll.push(...step.items);
          }
          if (step.tag === QueryTag.OR) {
            o.includesAny.push(...step.items);
          }
          if (step.tag === QueryTag.NONE) {
            o.excludes.push(...step.items);
          }
          options[step.type] = o;
          break;
        }
      }

      ids = this.filterIDs(ids, { includes: idInclude, excludes: idExclude });
      ids = this.filterContaineds(ids, options[QueryType.CONTAINED] ?? DEFAULT);
      ids = this.filterTags(ids, options[QueryType.TAG] ?? DEFAULT);
    }

    for (const id of ids) {
      yield this.manager.containers[id];
    }

    return;
  }

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
      ids = this.filterContaineds(ids, {
        excludes: options.excludes,
        includesAll: options.includes,
        includesAny: []
      });
      if (!options.ids.length && cacheKey) {
        this.cache[cacheKey] = ids.slice();
      }
    }

    if (queryTags) {
      ids = this.filterTags(ids, {
        excludes: options.tagExcludes,
        includesAll: options.tagIncludes,
        includesAny: []
      });
    }

    if (queryMutations) {
      for (const m of [Mutation.CHANGED, Mutation.REMOVED, Mutation.CREATED]) {
        ids = this.filterMutations(ids, m, {
          includesAny: options[m],
          includesAll: [],
          excludes: []
        });
      }
    }

    return ids.map(id => containers[id]);
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
