import type { Container } from '../lib/Container';
import type { ContainerManager } from './ContainerManager';
import type { Mutation } from './ContainerManager';

export enum QueryType {
  ID = 1,
  CONTAINER = 2,
  CONTAINED = 3,
  TAG = 4
}

export enum QueryTag {
  ALL = 1,
  ANY = 2,
  SOME = 3,
  NONE = 4
}

export interface QueryState {
  type: QueryType | null;
  items: string[];
  tag: QueryTag;
  mutation: Mutation | null;
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

/**
 * Responsible for resolving each query into a series of IDs.
 */
export class QueryManager {
  protected cache: Record<string, string[]> = {};
  protected manager: ContainerManager;
  protected ids: string[] = [];
  protected canCache = true;

  // really heavy-handed
  public invalidateTypes(types: string[]): void {
    for (const type of types) {
      for (const key in this.cache) {
        if (key.includes(type)) {
          delete this.cache[key];
        }
      }
    }
  }

  public invalidateEntity(id: string): void {
    for (const key in this.cache) {
      this.cache[key] = this.cache[key].filter(i => i !== id);
    }
  }

  protected filterTags(
    ids: string[],
    tag: QueryTag,
    items: string[]
  ): string[] {
    const results: string[] = [];
    const tags = this.manager.tags;

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        if (id in tags) {
          const itemTags = tags[id];
          for (const i of items) {
            if (itemTags.indexOf(i) === -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        if (id in tags) {
          const itemTags = tags[id];
          for (const i of items) {
            if (itemTags.indexOf(i) > -1) {
              results.push(id);
              continue search;
            }
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        if (id in tags) {
          const itemTags = tags[id];
          for (const i of items) {
            if (itemTags.indexOf(i) > -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    return results;
  }

  protected filterContaineds(
    ids: string[],
    tag: QueryTag,
    items: string[]
  ): string[] {
    const results: string[] = [];
    const bindings = this.manager.bindings;

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        const b = bindings[id];
        for (const i of items) {
          if (!(i in b)) {
            continue search;
          }
        }
        results.push(id);
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        const b = bindings[id];
        for (const i of items) {
          if (i in b) {
            results.push(id);
            continue search;
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        const b = bindings[id];
        for (const i of items) {
          if (i in b) {
            continue search;
          }
        }
        results.push(id);
      }
    }

    return results;
  }

  protected filterContainedMutations(
    ids: string[],
    mut: Mutation,
    tag: QueryTag,
    items: string[]
  ): string[] {
    const results: string[] = [];
    const bindings = this.manager.bindings;
    const containers = this.manager.mutations[mut];

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        const mutations = containers[id];
        if (mutations?.length) {
          const b = bindings[id];
          for (const item of items) {
            if (mutations.indexOf(b[item]) === -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        const mutations = containers[id];
        if (mutations?.length) {
          const b = bindings[id];
          for (const i of items) {
            if (mutations.indexOf(b[i]) > -1) {
              results.push(id);
              continue search;
            }
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        const mutations = containers[id];
        if (mutations?.length) {
          const b = bindings[id];
          for (const i of items) {
            if (mutations.indexOf(b[i]) > -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    return results;
  }

  protected filterIDMutations(
    ids: string[],
    mut: Mutation,
    tag: QueryTag,
    identifiers: string[] | null
  ): string[] {
    const containers = this.manager.mutations[mut];
    const results: string[] = [];

    if (tag !== QueryTag.NONE) {
      search: for (const id of ids) {
        const hasMutations = containers[id]?.length > 0;
        if ((!identifiers || identifiers.indexOf(id) > -1) && hasMutations) {
          results.push(id);
          continue search;
        }
      }
    }
    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        const hasMutations = containers[id]?.length > 0;
        if ((!identifiers || identifiers.indexOf(id) > -1) && !hasMutations) {
          continue search;
        }
        results.push(id);
      }
    }

    return results;
  }
  /**
   * Get the initial ID set to begin filtering. If we've specified an ID or
   * Entity, we can use those smaller lists instead of the big one.
   */
  protected getInitialIDs(step: QueryState): string[] {
    if (step.type === QueryType.ID) {
      this.canCache = false;
      if (step.tag === QueryTag.NONE) {
        return this.ids.filter(i => step.items.indexOf(i) === -1);
      } else return step.items;
    }

    if (step.type === QueryType.CONTAINER) {
      this.canCache = false;
      return step.items.reduce(
        (a: string[], b) => a.concat(this.manager.byContainerType[b]),
        []
      );
    }

    return this.ids;
  }

  protected getCacheKey(
    type: QueryType,
    tag: QueryTag,
    items: string[]
  ): string | null {
    return items.length
      ? JSON.stringify([type, tag, items.sort((a, b) => a.localeCompare(b))])
      : null;
  }

  /**
   * We'd like to take advantage of caching where possible, but odds are we're
   * going to be treading into uncached waters pretty quickly. So we'll stop
   * adding to the cache once we've hit that point, but if there's anything to
   * be gained by fetching cached results, we want to take advcantage of it.
   */
  protected filterCachedResult(ids: string[], cached?: string[]): string[] {
    if (cached?.length && ids.length > cached.length) {
      const results = [];
      for (const item of cached) {
        if (ids.indexOf(item) > -1) {
          results.push(item);
        }
      }
      return results;
    }
    return ids;
  }

  /**
   * If possible,read/write a new value. Otherwise, attempt to use the cache for
   * reads, but don't write.
   */
  protected withCached(key: string | null, fn: () => string[]): string[] {
    return key
      ? this.canCache
        ? (this.cache[key] ??= fn())
        : this.filterCachedResult(fn(), this.cache[key])
      : fn();
  }

  /**
   * It's important to shift steps into an efficient order before starting. We
   * want to filter out as many items as we can, as quickly as we can. The
   * QueryType enum is roughly sorted in this order.
   */
  protected sortSteps(steps: QueryState[]): QueryState[] {
    return (
      steps
        .filter(s => s.type)
        // sort in QueryType order
        .sort((a, b) => a.type! - b.type!)
        // sort mutations earlier
        .sort((a, b) => (a.mutation ? -1 : 0) + (b.mutation ? 1 : 0))
    );
  }

  /**
   *
   * @param steps
   * @privateRemarks
   * "The fastest code is the code that never runs."
   */
  public *execute(steps: QueryState[]): IterableIterator<Container> {
    this.ids = Object.keys(this.manager.containers);
    this.canCache = true;

    let ids: string[] = [];
    let step = 0;

    steps: for (const { type, tag, items, mutation } of this.sortSteps(steps)) {
      // "some" is purely for type-hinting
      if (tag === QueryTag.SOME || !type) {
        continue;
      }

      // if possible, cache the step
      const cacheKey = this.canCache
        ? this.getCacheKey(type, tag, items)
        : null;

      ids = step ? ids : this.getInitialIDs({ type, tag, items, mutation });
      if (type === QueryType.TAG) {
        ids = this.withCached(cacheKey, () => this.filterTags(ids, tag, items));
      }

      if (mutation) {
        this.canCache = false;
        if (type === QueryType.CONTAINED) {
          ids = this.filterContainedMutations(ids, mutation, tag, items);
        } else {
          ids = this.filterIDMutations(
            ids,
            mutation,
            tag,
            type === QueryType.CONTAINER ? null : items
          );
        }
        continue steps;
      }

      if (type === QueryType.CONTAINED) {
        ids = this.withCached(cacheKey, () =>
          this.filterContaineds(ids, tag, items)
        );
      }

      step++;
    }

    for (const id of ids) {
      if (id in this.manager.containers) {
        yield this.manager.containers[id];
      }
    }
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
