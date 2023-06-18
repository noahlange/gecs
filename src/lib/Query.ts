import type { Context, Entity } from '../ecs';
import type { BaseType, Identifier, QueryStep } from '../types';

import { Constraint } from '../types';
import { match, union } from '../utils';

type TargetContraints = Constraint.ALL | Constraint.NONE | Constraint.ANY;
type Targets = { [key in TargetContraints]: bigint | null };

const fns = {
  [Constraint.NONE]: match.none,
  [Constraint.ALL]: match.all,
  [Constraint.ANY]: match.any
};

export class Query<T extends BaseType = BaseType, E extends Entity<T> = Entity<T>> {
  public readonly id: Identifier;
  public key: bigint | null = null;

  protected ctx: Context;
  protected results: Set<E> = new Set();
  protected constraints: Set<TargetContraints> = new Set();
  protected refs: Identifier[] = [];

  /**
   * A mapping of bigint keys to whether or not they're valid matches. If we've already determined a key does not match, we don't want to check it again every tick. Because we do need to differentiate true/false from nullish, we're using a Map instead of a Set.
   */
  protected keys: Map<bigint, boolean> = new Map();
  protected steps: QueryStep[];
  protected executed: boolean = false;

  protected targets: Record<TargetContraints, bigint | null> = {
    [Constraint.ANY]: null,
    [Constraint.ALL]: null,
    [Constraint.NONE]: null
  };

  /**
   * Forcibly reload the query. This is expensive.
   */
  public refresh(): void {
    this.executed = true;
    const index = this.ctx.manager.index;
    this.results = new Set(
      index.get(index.keys().filter(key => this.filter(key))).map(id => this.ctx.manager.entities[id])
    ) as Set<E>;
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
    if (this.refs.length) {
      const entities = this.refs
        // @ts-ignore
        .map(id => this.ctx.manager.entities[id]?.refs.map(r => r.entity) ?? [])
        .reduce((a, b) => a.concat(b), []) as E[];

      for (const entity of entities) {
        if (this.results.has(entity)) {
          yield entity;
        }
      }
    } else {
      yield* this.results;
    }
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
    const constraint = step.constraint as TargetContraints;
    const id = this.ctx.manager.getID(...step.ids);
    targets[constraint] = targets[constraint] ? union(targets[constraint], id) : id;

    return targets;
  };

  /**
   * Some code only needs to run once (on instantiation)—this generates the
   * bigints used for entity matching during the filtering process.
   */
  protected init(): void {
    const targets: Record<TargetContraints, QueryStep[]> = {
      [Constraint.ALL]: [],
      [Constraint.ANY]: [],
      [Constraint.NONE]: []
    };

    for (const step of this.steps) {
      if (step.constraint !== Constraint.SOME && step.constraint !== Constraint.IN) {
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

  public constructor(context: Context, steps: QueryStep[]) {
    this.ctx = context;
    this.id = context.ids.id.next();
    this.refs = steps
      .filter(step => step.constraint === Constraint.IN)
      .reduce((a: Identifier[], b) => a.concat(b.ids), []);
    this.steps = steps.filter(({ constraint: c }) => c !== Constraint.SOME && c !== Constraint.IN);
    this.init();
  }
}
