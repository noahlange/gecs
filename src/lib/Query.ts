import type { Entity } from '../ecs';
import type { QueryStep, BaseType } from '../types';
import type { EntityManager } from '../managers/EntityManager';

import { QueryTag } from '../types';

import { match, union } from '../utils';
import { nanoid } from 'nanoid/non-secure';
import type { QueryManager } from '../managers';

type TagsExceptSome = Exclude<QueryTag, QueryTag.SOME>;
type Targets = { [key in TagsExceptSome]: bigint | null };

const fns = {
  [QueryTag.NONE]: match.none,
  [QueryTag.ALL]: match.all,
  [QueryTag.ANY]: match.any
};

enum QueryStatus {
  PENDING = 0,
  RESOLVED = 1,
  UPDATE = 2,
  FAILED = 3
}

export class Query<
  T extends BaseType = BaseType,
  E extends Entity<T> = Entity<T>
> {
  protected id = nanoid(6);

  protected arrays: Set<string> = new Set();
  protected singles: Set<string> = new Set();

  protected steps: QueryStep[];
  protected results: Set<E> = new Set();
  protected tags: Set<TagsExceptSome> = new Set();
  /**
   * Unidentified query items (i.e., without a bitmask).
   */
  protected unresolved: Set<string> = new Set();

  protected queryManager: QueryManager;
  protected entityManager: EntityManager;
  protected attempts: number = 0;
  protected status: QueryStatus = QueryStatus.PENDING;

  protected reducer = (targets: Targets, step: QueryStep): Targets => {
    if (step.tag === QueryTag.SOME) {
      return targets;
    }

    const ids = step.ids
      .map(i => {
        // strip trailing brackets (foo[] -> foo)
        const res = this.entityManager.getID(i) ?? null;
        // if we aren't able to find a reference in the registry, mark it unresolved
        res === null ? this.unresolved.add(i) : this.unresolved.delete(i);
        return res;
      })
      // filter out unresolved items
      .filter(i => i !== null) as bigint[];

    targets[step.tag] = targets[step.tag]
      ? union(targets[step.tag]!, ...ids)
      : union(...ids);

    return targets;
  };

  protected targets: Record<TagsExceptSome, bigint | null> = {
    [QueryTag.ANY]: null,
    [QueryTag.ALL]: null,
    [QueryTag.NONE]: null
  };

  /**
   * Some code only needs to run once (on instantiation)—this generates the
   * bigints used for entity matching during the filtering process.
   */
  protected init(): void {
    const targets: Record<TagsExceptSome, QueryStep[]> = {
      [QueryTag.ALL]: [],
      [QueryTag.ANY]: [],
      [QueryTag.NONE]: []
    };

    for (const step of this.steps) {
      if (step.tag !== QueryTag.SOME) {
        this.tags.add(step.tag);
        targets[step.tag].push(step);
      }
    }

    for (const tag of this.tags) {
      this.targets = targets[tag].reduce(this.reducer, this.targets);
    }
  }

  /**
   * Filter an arbitrary set of entities by the query's constraints.
   */
  protected filter(masks: bigint[]): Set<E> {
    const { tags, targets } = this;
    const keys: bigint[] = [];
    search: for (const mask of masks) {
      for (const tag of tags) {
        const target = targets[tag];
        if (!target || !fns[tag](target, mask)) {
          continue search;
        }
      }
      keys.push(mask);
    }
    return new Set(this.queryManager.index.get(keys)) as Set<E>;
  }

  public refresh(): void {
    const keys = this.queryManager.index.keys();
    this.results = this.filter(keys);
  }

  protected resolve(): void {
    if (this.attempts >= 10) {
      this.status = QueryStatus.FAILED;
      const items = Array.from(this.unresolved).join('", "');
      console.warn(
        `Failed to resolve "${items}" after 10 attempts. Pre-register or manually invoke \`.refresh()\` to reload.`
      );
    } else {
      this.attempts++;
      this.init();
      if (this.unresolved.size === 0) {
        this.status = QueryStatus.RESOLVED;
        this.refresh();
      }
    }
  }

  protected updateQuery(): void {
    switch (this.status) {
      case QueryStatus.PENDING: {
        this.resolve();
        break;
      }
      case QueryStatus.UPDATE: {
        for (const entities of this.queryManager.removed.values()) {
          for (const entity of entities) {
            this.results.delete(entity as E);
          }
        }
        const addedKeys = Array.from(this.queryManager.added.keys());
        const results = this.filter(addedKeys);
        for (const e of results) {
          this.results.add(e);
        }
        this.status = QueryStatus.RESOLVED;
        break;
      }
    }
  }

  public update(): void {
    this.status =
      this.status === QueryStatus.RESOLVED ? QueryStatus.UPDATE : this.status;
  }

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<E> {
    this.updateQuery();
    for (const item of this.results) {
      yield item;
    }
  }

  /**
   * Return all results as an array.
   */
  public get(): E[] {
    return Array.from(this);
  }

  /**
   * Return the first result, throwing if no results are found.
   */
  public find(): E {
    for (const item of this) {
      return item;
    }
    throw new Error('Query returned no results.');
  }

  /**
   * Return the first search result, or null if no results are found.
   */
  public first(): E | null {
    for (const item of this) {
      return item;
    }
    return null;
  }

  public constructor(entities: EntityManager, steps: QueryStep[]) {
    this.entityManager = entities;
    this.queryManager = entities.queries;
    this.steps = steps.filter(step => step.tag !== QueryTag.SOME);
  }
}
