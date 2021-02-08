import type { Container } from '../lib/Container';
import type { ContainerManager } from './ContainerManager';
import { Mutation } from './ContainerManager';

import intersection from 'fast_array_intersect';
import { difference, union } from '../utils';

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
  tag: QueryTag;
  items: string[];
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
  protected typeCache: Record<string, string[]> = {};
  protected cache: Record<string, string[]> = {};
  protected manager: ContainerManager;
  protected ids: string[] = [];
  protected canCache = true;

  public invalidateTypes(types: string[]): void {
    for (const type of types) {
      for (const key of this.typeCache[type] ?? []) {
        delete this.cache[key];
      }
    }
  }

  public invalidateEntity(id: string): void {
    for (const key in this.cache) {
      this.cache[key] = this.cache[key].filter(i => i !== id);
    }
  }

  protected sortSteps(steps: QueryState[]): QueryState[] {
    return steps
      .filter(step => step.type && step.tag !== QueryTag.SOME)
      .sort((a, b) => (a.type ?? 0) - (b.type ?? 0))
      .sort((a, b) => ((a.mutation ?? 0) && 1) + ((b.mutation ?? 0) && -1));
  }

  protected getCacheKey(
    type: QueryType,
    tag: QueryTag,
    items: string[]
  ): string | null {
    return this.canCache && items.length
      ? type + ':' + tag + ':' + items.join(',')
      : null;
  }

  protected getSearchData(
    mutation: Mutation | null,
    step: QueryType
  ): Record<string, string[]> {
    if (mutation) {
      // We want created records to count as changed. We don't want to
      // double-store anything, so we'll just tack the extra items on the end.
      const mutationData = this.manager.byMutatedComponent[mutation];
      if (mutation === Mutation.CHANGED) {
        const extra = this.manager.byMutatedComponent[Mutation.CREATED];
        for (const key in extra) {
          (mutationData[key] ??= []).push(...extra[key]);
        }
      }
      switch (step) {
        case QueryType.CONTAINED:
          return mutationData;
        case QueryType.CONTAINER:
        case QueryType.ID:
        case QueryType.TAG:
          return {};
      }
    } else {
      switch (step) {
        case QueryType.CONTAINER:
          return this.manager.byContainerType;
        case QueryType.CONTAINED:
          return this.manager.byComponent;
        case QueryType.TAG:
          return this.manager.byTag;
        case QueryType.ID:
          return {};
      }
    }
  }

  /**
   *
   * @privateRemarks
   * Credit and gratitude to [ape-ecs](https://github.com/fritzy/ape-ecs) for the inspiration.
   */
  public *execute(steps: QueryState[]): IterableIterator<Container> {
    this.canCache = true;
    this.ids = Object.keys(this.manager.containers);
    let firstStep = true;
    let results: string[] = [];

    for (const { mutation, tag, type, items } of this.sortSteps(steps)) {
      if (type === QueryType.ID) {
        results = firstStep ? items : intersection([results, items]);
        this.canCache = false;
        continue;
      }

      if (mutation) {
        this.canCache = false;
      }

      const key = this.getCacheKey(type!, tag, items);
      if (key && key in this.cache) {
        results = this.cache[key].slice();
        firstStep = false;
        continue;
      }

      const data = this.getSearchData(mutation, type!);

      if (tag !== QueryTag.NONE) {
        const ids = items.map(item => data[item] ?? []);
        const next = tag === QueryTag.ALL ? intersection(ids) : union(...ids);
        results = results.length ? intersection([results, next]) : next;
      } else {
        if (firstStep) {
          results = this.ids;
        }
        const whitelist: string[][] = [];
        const blacklist: string[][] = [];
        for (const key in data) {
          if (!items.includes(key)) {
            whitelist.push(data[key]);
          } else {
            blacklist.push(data[key]);
          }
        }

        results = intersection([
          results,
          difference(union(...whitelist), union(...blacklist))
        ]);
      }

      if (key) {
        for (const type of items) {
          (this.typeCache[type] ??= []).push(key);
        }
        this.cache[key] = results.slice();
      }

      this.canCache = false;
      firstStep = false;
    }

    for (const id of results) {
      if (id in this.manager.containers) {
        yield this.manager.containers[id];
      }
    }
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
