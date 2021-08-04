import type { Entity } from '../ecs';
import type { BaseType, QueryStep } from '../types';
import type { Manager } from './Manager';

import { Constraint } from '../types';
import { getID, match, union } from '../utils';

type ConstraintsExceptSome = Exclude<Constraint, Constraint.SOME>;
type Targets = { [key in ConstraintsExceptSome]: bigint | null };

const fns = {
  [Constraint.NONE]: match.none,
  [Constraint.ALL]: match.all,
  [Constraint.ANY]: match.any
};

export class Query<
  T extends BaseType = BaseType,
  E extends Entity<T> = Entity<T>
> {
  public readonly id = getID();
  public key: bigint | null = null;

  protected results: Set<E> = new Set();
  protected constraints: Set<ConstraintsExceptSome> = new Set();

  /**
   * A mapping of bigint keys to whether or not they're valid matches. If we've already determined a key does not match, we don't want to check it again every tick. Because we do need to differentiate true/false from nullish, we're using a Map instead of a Set.
   */
  protected keys: Map<bigint, boolean> = new Map();
  protected steps: QueryStep[];
  protected manager: Manager;
  protected executed: boolean = false;

  protected targets: Record<ConstraintsExceptSome, bigint | null> = {
    [Constraint.ANY]: null,
    [Constraint.ALL]: null,
    [Constraint.NONE]: null
  };

  /**
   * Forcibly reload the query. This is pretty expensive.
   */
  public refresh(): void {
    this.executed = true;
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

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): IterableIterator<E> {
    if (!this.executed) {
      this.refresh();
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

  protected reducer = (targets: Targets, step: QueryStep): Targets => {
    // we've already thrown if an ID hasn't been resolved
    const constraint = step.constraint as ConstraintsExceptSome;
    const id = this.manager.getID(...step.ids);
    targets[constraint] = targets[constraint]
      ? union(targets[constraint], id)
      : id;

    return targets;
  };

  /**
   * Some code only needs to run once (on instantiation)—this generates the
   * bigints used for entity matching during the filtering process.
   */
  protected init(): void {
    const targets: Record<ConstraintsExceptSome, QueryStep[]> = {
      [Constraint.ALL]: [],
      [Constraint.ANY]: [],
      [Constraint.NONE]: []
    };

    for (const step of this.steps) {
      if (step.constraint !== Constraint.SOME) {
        this.constraints.add(step.constraint);
        targets[step.constraint].push(step);
      }
    }

    for (const constraint of this.constraints) {
      this.targets = targets[constraint].reduce(this.reducer, this.targets);
    }

    this.key = union(...Object.values(this.targets));
  }

  /**
   * Assuming we're pruning the index regularly, the number of unique bitmasks for all entities will always be less than (or equal to) the total number of entities. So instead of iterating over entities, we'll find each matching unique bitmask and return the entities corresponding to those bitmasks.
   */
  protected filter(mask: bigint): boolean {
    let res = this.keys.get(mask) ?? null;
    if (res === null) {
      res = true;
      for (const tag of this.constraints) {
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

  public constructor(entities: Manager, steps: QueryStep[]) {
    this.manager = entities;
    // .some() only changes the type signature
    this.steps = steps.filter(step => step.constraint !== Constraint.SOME);
    this.init();
  }
}
