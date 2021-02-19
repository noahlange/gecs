import type { Entity } from '../ecs';
import type { QueryStep, BaseType } from '../types';
import type { EntityManager } from '../managers/EntityManager';

import { QueryTag, QueryType } from '../types';

import { match, union } from '../utils';
import { nanoid } from 'nanoid/non-secure';

type TagsExceptSome = Exclude<QueryTag, QueryTag.SOME>;
type Targets = { [key in QueryType]?: bigint };

const arrayOf = /\[\]$/gim;

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

export class Query<T extends BaseType = BaseType> {
  protected id = nanoid(8);
  protected steps: QueryStep[];
  protected results: Set<Entity> = new Set();
  protected entities: EntityManager;
  protected arrays: Set<string> = new Set();
  protected unresolved: Set<string> = new Set();

  protected added: Entity[] = [];
  protected removed: Entity[] = [];
  protected status: QueryStatus = QueryStatus.PENDING;
  protected attempts: number = 0;

  /**
   * These are populated during init()—if some tag or type doesn't make an
   * appearance in the query steps, we don't to spend time looping around for it.
   */
  protected types: Set<QueryType> = new Set();
  protected tags: Set<TagsExceptSome> = new Set();

  protected reducer = (a: Targets, step: QueryStep): Targets => {
    const ids = step.items
      // strip trailing brackets
      .map(i => {
        const res =
          this.entities.getID(step.type, i.replace(arrayOf, '')) ?? null;
        res === null ? this.unresolved.add(i) : this.unresolved.delete(i);
        return res;
      })
      .filter(i => i !== null) as bigint[];
    a[step.type] = a[step.type] ? union(a[step.type]!, ...ids) : union(...ids);
    return a;
  };

  // QueryTag -> QueryType -> bigint
  protected targets: Record<TagsExceptSome, Targets> = {
    [QueryTag.ANY]: {},
    [QueryTag.ALL]: {},
    [QueryTag.NONE]: {}
  };

  /**
   * Some code only needs to be run once (on instantiation)—this generates the
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
      if (step.type === QueryType.CMP) {
        for (const item of step.items) {
          if (arrayOf.test(item)) {
            this.arrays.add(item.replace(arrayOf, ''));
          }
        }
      }
      this.types.add(step.type);
    }

    for (const tag of this.tags) {
      this.targets[tag] = targets[tag].reduce(
        this.reducer,
        this.targets[tag] ?? {}
      );
    }
  }

  /**
   * Filter an arbitrary set of entities by the query's constraints.
   */
  protected filter(entities: Set<Entity>): Set<Entity> {
    const { types, tags, targets } = this;
    const hasArrays = this.arrays.size > 0;
    search: for (const entity of entities) {
      // all/any/none
      for (const tag of tags) {
        // components/entity/tags
        for (const type of types) {
          if (targets[tag][type]) {
            let value = entity.ids[type];
            if (value) {
              if (Array.isArray(value)) {
                if (!hasArrays) {
                  entities.delete(entity);
                  continue search;
                }
                value = value[0];
              }
              if (!fns[tag](targets[tag][type]!, value)) {
                entities.delete(entity);
                continue search;
              }
            } else {
              entities.delete(entity);
              continue search;
            }
          }
        }
      }
      // check arrays vs. POJOs (e.g., foo[] vs foo)
      if (hasArrays) {
        for (const key in entity.$) {
          if (Array.isArray((entity.$ as any)[key]) !== this.arrays.has(key)) {
            entities.delete(entity);
            continue search;
          }
        }
      }
    }
    return entities;
  }

  public refresh(): void {
    const data = new Set(this.entities.entities.values());
    this.results = this.filter(data);
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

  public update(): void {
    const { added, removed } = this.entities.queries;
    switch (this.status) {
      case QueryStatus.PENDING: {
        this.added = Array.from(new Set(this.added.concat(...added)));
        this.removed = Array.from(new Set(this.removed.concat(...removed)));
        break;
      }
      case QueryStatus.RESOLVED: {
        for (const e of this.filter(added)) {
          this.results.add(e);
        }
        for (const e of removed) {
          this.results.delete(e);
        }
        break;
      }
    }
  }

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<Entity<T>> {
    if (this.status === QueryStatus.PENDING) {
      this.resolve();
    }
    for (const item of this.results) {
      yield item as Entity<T>;
    }
  }

  public get(): Entity<T>[] {
    return Array.from(this) as Entity<T>[];
  }

  public constructor(entities: EntityManager, steps: QueryStep[]) {
    this.steps = steps.filter(step => step.tag !== QueryTag.SOME);
    this.entities = entities;
  }
}
