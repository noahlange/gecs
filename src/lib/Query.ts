import type { Entity } from '../ecs';
import type { BaseType, QueryStep } from '../types';
import type { Manager } from './Manager';

import { getID } from '../ids';
import { Constraint } from '../types';
import { match, union } from '../utils';

type TagsExceptSome = Exclude<Constraint, Constraint.SOME>;
type Targets = { [key in TagsExceptSome]: bigint | null };

const fns = {
  [Constraint.NONE]: match.none,
  [Constraint.ALL]: match.all,
  [Constraint.ANY]: match.any
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
  public readonly id = getID();
  public key: bigint = 0n;
  public destroyed: boolean = false;

  /**
   * Unidentified query items (i.e., without a bitmask).
   */
  protected unresolved: Set<string> = new Set();
  protected results: Set<E> = new Set();
  protected tags: Set<TagsExceptSome> = new Set();
  protected keys: Map<bigint, boolean> = new Map();
  protected steps: QueryStep[];

  protected manager: Manager;
  protected attempts: number = 0;
  protected status: QueryStatus = QueryStatus.PENDING;

  protected reducer = (targets: Targets, step: QueryStep): Targets => {
    if (step.constraint === Constraint.SOME) {
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

    targets[step.constraint] = targets[step.constraint]
      ? union(targets[step.constraint]!, ...ids)
      : union(...ids);

    return targets;
  };

  protected targets: Record<TagsExceptSome, bigint | null> = {
    [Constraint.ANY]: null,
    [Constraint.ALL]: null,
    [Constraint.NONE]: null
  };

  /**
   * Some code only needs to run once (on instantiation)—this generates the
   * bigints used for entity matching during the filtering process.
   */
  protected init(): void {
    const targets: Record<TagsExceptSome, QueryStep[]> = {
      [Constraint.ALL]: [],
      [Constraint.ANY]: [],
      [Constraint.NONE]: []
    };

    for (const step of this.steps) {
      if (step.constraint !== Constraint.SOME) {
        this.tags.add(step.constraint);
        targets[step.constraint].push(step);
      }
    }

    for (const tag of this.tags) {
      this.targets = targets[tag].reduce(this.reducer, this.targets);
    }
  }

  /**
   * The number of unique bitmasks for all entities will always be less than
   * (or equal to) the total number of entities. So instead of iterating over
   * entities, we'll find each matching unique bitmask and return the entities
   * corresponding to those bitmasks.
   */
  protected filter(mask: bigint): boolean {
    let res = this.keys.get(mask) ?? null;
    if (res === null) {
      res = true;
      for (const tag of this.tags) {
        const target = this.targets[tag];
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

  public update(additions: Entity[], removals: Entity[]): void {
    // remove first, we may very well be re-adding it later
    for (const removal of removals) {
      this.results.delete(removal as E);
    }
    for (const add of additions) {
      const res = this.keys.get(add.key) ?? null;
      if (res || (res === null && this.filter(add.key))) {
        this.results.add(add as E);
      }
    }
  }

  public destroy(): void {
    this.destroyed = true;
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
        let key = 0n;
        this.status = QueryStatus.RESOLVED;
        for (const t of Object.values(this.targets)) {
          key |= t ?? 0n;
        }
        this.key = key;
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
      .filter(step => step.constraint !== Constraint.SOME);
  }
}
