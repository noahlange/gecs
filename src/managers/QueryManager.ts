import type { Container } from '../lib/Container';
import type { ContainerManager } from './ContainerManager';
import { Mutation } from '../types';

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

const joiner = {
  [QueryTag.ALL]: '&',
  [QueryTag.ANY]: '|',
  [QueryTag.SOME]: '?',
  [QueryTag.NONE]: '!'
};

export interface QueryState {
  type: QueryType;
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
  protected invalidTypes: string[] = [];

  public clearCache(): void {
    const caches = [];
    for (const type of this.invalidTypes) {
      caches.push(...(this.typeCache[type] ?? []));
      this.typeCache[type] = [];
    }
    for (const key of caches) {
      delete this.cache[key];
    }
    this.invalidTypes = [];
  }

  public invalidateTypes(types: string[]): void {
    this.invalidTypes.push(...types);
  }

  public invalidateEntity(id: string): void {
    for (const key in this.cache) {
      this.cache[key] = this.cache[key].filter(i => i !== id);
    }
  }

  public cacheSetOp(step: QueryState, results?: () => string[]): string[] {
    const key = this.getCacheKey(step, joiner[step.tag]);
    if (key && !step.mutation) {
      if (this.cache[key]) {
        return this.cache[key]!;
      } else if (results) {
        for (const item of step.items) {
          (this.typeCache[item] ??= []).push(key);
        }
        return (this.cache[key] = results());
      }
    }
    return results?.() ?? [];
  }

  protected sortSteps(steps: QueryState[]): QueryState[] {
    return steps
      .filter(step => step.type && step.tag !== QueryTag.SOME)
      .sort((a, b) => (a.type ?? 0) - (b.type ?? 0))
      .sort((a, b) => ((a.mutation ?? 0) && 1) + ((b.mutation ?? 0) && -1));
  }

  protected getCacheKey(step: QueryState, joiner: string = ','): string | null {
    return this.canCache && step.items.length
      ? step.type + ':' + step.tag + ':' + step.items.join(joiner)
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
  public execute(steps: QueryState[]): Container[] {
    if (this.invalidTypes.length) {
      this.clearCache();
    }

    this.canCache = true;
    let firstStep = true;
    let results: string[] = [];

    for (const step of this.sortSteps(steps)) {
      const tag = step.tag ?? QueryTag.ALL;

      if (step.type === QueryType.ID) {
        results = firstStep ? step.items : intersection([results, step.items]);
        this.canCache = false;
        continue;
      }

      const key = this.getCacheKey(step);
      const data = this.getSearchData(step.mutation, step.type);

      if (key && this.cache[key]) {
        results = this.cache[key]?.slice() ?? [];
        firstStep = false;
        continue;
      }

      if (step.mutation) {
        // Record<ContainerType, ContainedID[]>
        const data = this.getSearchData(null, step.type);
        // ensure that we've constrained
        results = this.cacheSetOp({ ...step, tag: QueryTag.ALL }, () =>
          intersection(step.items.map(item => data[item] ?? []))
        );
        this.canCache = false;
      }

      if (tag !== QueryTag.NONE) {
        const next = this.cacheSetOp(step, (): string[] => {
          const ids = step.items.map(item => data[item] ?? []);
          return ids.length > 1 && tag === QueryTag.ALL
            ? intersection(ids)
            : union(...ids);
        });

        results =
          firstStep && !results.length ? next : intersection([results, next]);
      } else {
        if (firstStep && !results.length) {
          results = this.manager.containers.ids();
        }

        const whitelist: string[][] = [];
        const blacklist: string[][] = [];

        for (const key in data) {
          // this is hideously, mind-bogglingly inefficient
          if (step.items.indexOf(key) === -1) {
            whitelist.push(data[key]);
          } else {
            blacklist.push(data[key]);
          }
        }

        const res = this.cacheSetOp(step, () =>
          difference(union(...whitelist), union(...blacklist))
        );

        results = intersection([results, res]);
      }

      if (this.canCache && key) {
        for (const type of step.items) {
          (this.typeCache[type] ??= []).push(key);
        }
        this.cache[key] = results;
      }

      this.canCache = false;
      firstStep = false;
    }

    return results.map(id => this.manager.containers.get(id)).filter(f => !!f);
  }

  public constructor(manager: ContainerManager) {
    this.manager = manager;
  }
}
