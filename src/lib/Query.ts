import type { Entity } from '../ecs';
import type { BaseType, QueryStep } from '../types';
import type { Manager } from './Manager';
import type { Unsubscribe } from 'nanoevents';

import { getID } from '../ids';
import { QueryTag } from '../types';
import { match, union } from '../utils';

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
  protected id = getID();

  /**
   * Unidentified query items (i.e., without a bitmask).
   */
  protected unresolved: Set<string> = new Set();
  protected arrays: Set<string> = new Set();
  protected singles: Set<string> = new Set();
  protected results: Set<E> = new Set();
  protected tags: Set<TagsExceptSome> = new Set();
  protected keys: Map<bigint, boolean> = new Map();

  protected manager: Manager;
  protected attempts: number = 0;
  protected status: QueryStatus = QueryStatus.PENDING;

  protected steps: QueryStep[];

  protected unsubscribe: {
    added: Unsubscribe | null;
    removed: Unsubscribe | null;
  } = { added: null, removed: null };

  protected reducer = (targets: Targets, step: QueryStep): Targets => {
    if (step.tag === QueryTag.SOME) {
      return targets;
    }

    const ids = step.ids
      .map(i => {
        const res = this.manager.getID(i);
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
   * Secret sauce: by definition, the number of unique bitmasks will always be
   * less than or equal to the total number of entities. So instead of iterating
   * over entities, we'll filter on unique bitmasks and return the
   * corresponding entities.
   */
  protected filter(mask: bigint): boolean {
    const { tags, targets } = this;
    let res = this.keys.get(mask) ?? null;
    if (res === null) {
      res = true;
      for (const tag of tags) {
        const target = targets[tag];
        if (!target || !fns[tag](target, mask)) {
          res = false;
          break;
        }
      }
      this.keys.set(mask, res);
    }
    return res;
  }

  public refresh(): void {
    const matches = this.manager.index.keys().filter(key => this.filter(key));
    this.results = new Set(this.manager.index.get(matches)) as Set<E>;
  }

  public destroy(): void {
    this.unsubscribe.added?.();
    this.unsubscribe.removed?.();
  }

  protected addEventListeners(): void {
    this.unsubscribe.added = this.manager.on('added', additions => {
      for (const add of additions.filter(entity => this.filter(entity.key))) {
        this.results.add(add as E);
      }
    });
    this.unsubscribe.removed = this.manager.on('removed', removals => {
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
  public *[Symbol.iterator](): IterableIterator<E> {
    if (this.status === QueryStatus.PENDING) {
      this.resolve();
    }
    yield* this.results;
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

  public constructor(entities: Manager, steps: QueryStep[]) {
    this.manager = entities;
    this.steps = steps
      // .some() only changes the type signature
      .filter(step => step.tag !== QueryTag.SOME);
  }
}
