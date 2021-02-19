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

function reducer(entities: EntityManager) {
  return (a: Targets, b: QueryStep): Targets => {
    const ids = b.items
      // strip trailing brackets
      .map(i => entities.getID(b.type, i.replace(arrayOf, '')) ?? null)
      .filter(i => i !== null) as bigint[];
    a[b.type] = a[b.type] ? union(a[b.type]!, ...ids) : union(...ids);
    return a;
  };
}

export class Query<T extends BaseType = BaseType> {
  protected id = nanoid(8);
  protected steps: QueryStep[];
  protected results: Set<Entity> = new Set();
  protected entities: EntityManager;
  protected arrays: Set<string> = new Set();

  /**
   * These are populated during init()—if some tag or type doesn't make an
   * appearance in the query steps, we don't to spend time looping around for it.
   */
  protected types: Set<QueryType> = new Set();
  protected tags: Set<TagsExceptSome> = new Set();

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

    const reduce = reducer(this.entities);
    for (const tag of this.tags) {
      this.targets[tag] = targets[tag].reduce(reduce, {});
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

  public unload(entities: Set<Entity> = new Set()): void {
    for (const e of entities) {
      this.results.delete(e);
    }
  }

  public refresh(entities?: Set<Entity>): void {
    if (entities) {
      for (const e of this.filter(entities)) {
        this.results.add(e);
      }
    } else {
      this.init();
      const data = new Set(this.entities.entities.values());
      this.results = this.filter(data);
    }
  }

  public get(): Entity<T>[] {
    return Array.from(this.results) as Entity<T>[];
  }

  /**
   * Iterate through search results.
   */
  public *[Symbol.iterator](): Iterator<Entity<T>> {
    for (const item of this.results) {
      yield item as Entity<T>;
    }
  }

  public constructor(entities: EntityManager, steps: QueryStep[]) {
    this.steps = steps;
    this.entities = entities;
    this.init();
  }
}
