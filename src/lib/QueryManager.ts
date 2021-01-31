import type { Container } from './Container';
import type { Manager } from './Manager';

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

  protected manager: Manager;

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
    const findMutations = !!(
      options.changed ||
      options.removed ||
      options.created
    );

    const cacheHit = options.ids ? null : this.cache[cacheKey];

    if (cacheHit && !findMutations) {
      for (const id of cacheHit) {
        yield this.manager.getContainer(id);
      }
      return;
    }

    const ids = options.ids ?? cacheHit ?? this.ids;
    const results: string[] = [];

    search: for (const id of ids) {
      const bindings = this.manager.getIDBindings(id);
      if (!bindings) {
        continue search;
      }

      if (!cacheHit) {
        // check the includes/excludes
        if (
          options.includes?.some(t => !(t in bindings)) ||
          options.excludes?.some(t => t in bindings)
        ) {
          continue search;
        }
      }

      results.push(id);

      if (findMutations) {
        const allMutations = this.manager.mutations;

        const types: Record<keyof typeof allMutations, string[] | null> = {
          changed: options.changed,
          created: options.created,
          removed: options.removed
        };

        for (const key in allMutations) {
          const k = key as keyof typeof allMutations;
          const mutations = allMutations[k];

          const containeds = types[k];
          if (containeds) {
            let pass = false;

            for (const type of containeds) {
              const id = bindings[type];
              if (mutations.has(id)) {
                mutations.delete(id);
                pass = true;
              }
            }
            if (!pass) {
              continue search;
            }
          }
        }
      }

      yield this.manager.getContainer(id);
    }

    if (!options.ids) {
      this.cache[cacheKey] = results;
    }

    return;
  }

  public constructor(manager: Manager) {
    this.manager = manager;
  }
}
