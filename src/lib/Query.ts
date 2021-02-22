import type { Entity } from '../ecs';
import type { QueryStep, BaseType } from '../types';
import type { EntityManager } from '../managers/EntityManager';

import { QueryTag } from '../types';

import { match, union } from '../utils';
import { nanoid } from 'nanoid/non-secure';
import type { QueryManager } from '../managers';
import type { Unsubscribe } from 'nanoevents';

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
  FAILED = 2
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

  protected unsubscribe: {
    add: Unsubscribe | null;
    remove: Unsubscribe | null;
  } = { add: null, remove: null };

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
  protected filter(masks: bigint[]): bigint[] {
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
    return keys;
  }

  public refresh(): void {
    const keys = this.queryManager.index.keys();
    const matches = this.filter(keys);
    this.results = new Set(this.queryManager.index.get(matches)) as Set<E>;
  }

  public destroy(): void {
    this.unsubscribe.add?.();
    this.unsubscribe.remove?.();
  }

  protected addEventListeners(): void {
    this.unsubscribe.add = this.queryManager.on('added', additions => {
      const matches = this.filter(additions.map(a => a.key));
      for (const addition of additions) {
        if (matches.includes(addition.key)) {
          this.results.add(addition as E);
        }
      }
    });
    this.unsubscribe.remove = this.queryManager.on('removed', removals => {
      for (const removal of removals) {
        this.results.delete(removal as E);
      }
    });
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
        this.addEventListeners();
        this.refresh();
      }
    }
  }
  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<E> {
    if (this.status === QueryStatus.PENDING) {
      this.resolve();
    }
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

  public constructor(
    manager: QueryManager,
    entities: EntityManager,
    steps: QueryStep[]
  ) {
    this.queryManager = manager;
    this.entityManager = entities;
    this.steps = steps.filter(step => step.tag !== QueryTag.SOME);
  }
}
