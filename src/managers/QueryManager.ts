import type { Container } from '../lib/Container';
import type { ContainerManager } from './ContainerManager';
import type { Mutation } from './ContainerManager';

export enum QueryType {
  ID = 1,
  CONTAINED = 2,
  CONTAINER = 3,
  TAG = 4
}

export enum QueryTag {
  ALL = 'all',
  ANY = 'any',
  NONE = 'none'
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
    const allTags = this.manager.tags;

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        if (id in allTags) {
          const tags = allTags[id];
          for (const i of items) {
            if (tags.indexOf(i) === -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        if (id in allTags) {
          const tags = allTags[id];
          for (const i of items) {
            if (tags.indexOf(i) > -1) {
              results.push(id);
              continue search;
            }
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        if (id in allTags) {
          const tags = allTags[id];
          for (const i of items) {
            if (tags.indexOf(i) > -1) {
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
    const allBindings = this.manager.bindings;

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        const bindings = allBindings[id];
        for (const i of items) {
          if (!(i in bindings)) {
            continue search;
          }
        }
        results.push(id);
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        const bindings = allBindings[id];
        for (const i of items) {
          if (i in bindings) {
            results.push(id);
            continue search;
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        const bindings = allBindings[id];
        for (const i of items) {
          if (i in bindings) {
            continue search;
          }
        }
        results.push(id);
      }
    }

    return results;
  }

  protected filterMutations(
    ids: string[],
    mut: Mutation,
    tag: QueryTag,
    items: string[]
  ): string[] {
    const results: string[] = [];
    const allBindings = this.manager.bindings;
    const containers = this.manager.mutations[mut];

    if (tag === QueryTag.ALL) {
      search: for (const id of ids) {
        const mutations = containers[id];
        if (mutations?.length) {
          const bindings = allBindings[id];
          for (const item of items) {
            if (mutations.indexOf(bindings[item]) === -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    if (tag === QueryTag.ANY) {
      search: for (const id of ids) {
        const mutations = containers[id] ?? [];
        if (mutations?.length) {
          const bindings = allBindings[id];
          for (const i of items) {
            if (mutations.indexOf(bindings[i]) > -1) {
              results.push(id);
              continue search;
            }
          }
        }
      }
    }

    if (tag === QueryTag.NONE) {
      search: for (const id of ids) {
        const mutations = containers[id] ?? [];
        if (mutations?.length) {
          const bindings = allBindings[id];
          for (const i of items) {
            if (mutations.indexOf(bindings[i]) > -1) {
              continue search;
            }
          }
          results.push(id);
        }
      }
    }

    return results;
  }

  protected getInitialIDs(step: QueryState): string[] {
    if (step.type === QueryType.ID) {
      this.canCache = false;
      if (step.tag === QueryTag.NONE) {
        return Object.keys(this.manager.containers).filter(
          i => step.items.indexOf(i) === -1
        );
      } else {
        return step.items;
      }
    }
    if (step.type === QueryType.CONTAINER) {
      this.canCache = false;
      return step.items.reduce(
        (a: string[], b) => a.concat(this.manager.byContainerType[b]),
        []
      );
    }
    return Object.keys(this.manager.containers);
  }

  protected canCache = true;

  public getCacheKey(
    type: QueryType,
    tag: QueryTag,
    items: string[]
  ): string | null {
    return items.length ? JSON.stringify([type, tag, items]) : null;
  }

  public *execute(criteria: QueryState[]): IterableIterator<Container> {
    this.canCache = true;
    let ids: string[] = [];

    for (const step of criteria) {
      if (!step.type) {
        continue;
      }

      ids = this.getInitialIDs(step);

      const cacheKey = this.canCache
        ? this.getCacheKey(step.type, step.tag, step.items)
        : null;

      if (step.type === QueryType.TAG) {
        ids = this.withCached(cacheKey, () =>
          this.filterTags(ids, step.tag, step.items)
        );
      }

      if (step.type === QueryType.CONTAINED) {
        ids = this.withCached(cacheKey, () =>
          this.filterContaineds(ids, step.tag, step.items)
        );
      }

      if (step.mutation) {
        // cannot cache mutations
        this.canCache = false;
        ids = this.filterMutations(ids, step.mutation, step.tag, step.items);
      }
    }

    for (const id of ids) {
      yield this.manager.containers[id];
    }
  }

  protected withCached(key: string | null, fn: () => string[]): string[] {
    return this.canCache && key ? (this.cache[key] ??= fn()) : fn();
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
