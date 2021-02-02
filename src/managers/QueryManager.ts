import type { Container } from '../lib/Container';
import type { ContainerManager, Mutations } from './ContainerManager';

export interface QueryOptions {
  ids: string[] | null;
  includes: string[] | null;
  excludes: string[] | null;
  created: string[] | null;
  changed: string[] | null;
  removed: string[] | null;
}

export class QueryManager {
  protected cache: Record<string, string[] | null> = {};

  protected get ids(): string[] {
    return this.manager.ids;
  }

  protected manager: ContainerManager;

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
    const cacheHit = options.ids ? null : this.cache[cacheKey];
    const findMutations = !!(
      options.changed ||
      options.removed ||
      options.created
    );

    if (cacheHit && !findMutations) {
      for (const id of cacheHit) {
        yield this.manager.containers[id];
      }
      return;
    }

    const ids = options.ids ?? cacheHit ?? this.ids;
    const results: Set<string> = new Set();

    const includes = options.includes ?? [];
    const excludes = options.excludes ?? [];

    search: for (const id of ids) {
      const bindings = this.manager.bindings[id];

      if (!bindings) {
        continue search;
      }

      if (!cacheHit) {
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
      }

      results.add(id);
    }

    if (!options.ids) {
      this.cache[cacheKey] = Array.from(results);
    }

    if (findMutations) {
      const yielded: Set<string> = new Set();
      const keys = Object.keys(this.manager.mutations).filter(
        key => options[key as keyof Mutations]
      ) as (keyof Mutations)[];

      for (const key of keys) {
        const types = options[key] ?? [];
        const containers = this.manager.mutations[key];
        loop: for (const id of results) {
          if (id in containers && !yielded.has(id)) {
            const mutations = containers[id];
            if (mutations.size) {
              const bindings = this.manager.bindings[id];
              for (const type of types) {
                if (mutations.has(bindings[type])) {
                  yielded.add(id);
                  continue loop;
                }
              }
            }
          }
        }
      }

      for (const id of yielded) {
        for (const key of keys) {
          this.manager.mutations[key][id] = new Set();
        }
        yield this.manager.containers[id];
      }
    } else {
      for (const id of results) {
        yield this.manager.containers[id];
      }
    }
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
