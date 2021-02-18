import type { QueryStep } from '../types';
import { difference } from '../utils';
import type { EntityManager } from './EntityManager';

// these aliases exist purely for clarity's sake
type FilterID = string;
type EntityID = string;
type QueryID = string;

export class QueryCache {
  protected ids: Record<FilterID, Set<QueryID>> = {};
  protected mutations: Record<QueryID, EntityID[]> = {};
  protected queries: Record<QueryID, EntityID[]> = {};
  protected manager: EntityManager;
  protected pending: Record<EntityID, QueryID[]> = {};

  public set(step: QueryStep, results: EntityID[]): EntityID[] {
    if (step.key) {
      this.queries[step.key] = Array.from(new Set(results));
      for (const item of step.items.map(i =>
        this.manager.getID(step.type, i)
      )) {
        (this.ids[item] ??= new Set()).add(step.key);
      }
    }
    return results;
  }

  public has(step: QueryStep): boolean {
    return step.key in this.queries;
  }

  public get(
    step: QueryStep,
    regen?: (ids: EntityID[]) => EntityID[]
  ): EntityID[] {
    if (this.mutations[step.key] && regen) {
      const mutations = this.mutations[step.key];
      const results = difference(this.queries[step.key], mutations);

      results.push(...regen(mutations));
      this.queries[step.key] = Array.from(new Set(results));
      delete this.mutations[step.key];
    }
    return this.queries[step.key];
  }

  public refresh(): void {
    const pending = Object.entries(this.pending);
    for (const [entity, items] of pending) {
      for (const item of items) {
        for (const query of this.ids[item] ?? []) {
          (this.mutations[query] ??= []).push(entity);
        }
      }
    }
    this.pending = {};
  }

  public tag(entity: EntityID, items: FilterID[]): void {
    this.pending[entity] = items;
  }

  public constructor(manager: EntityManager) {
    this.manager = manager;
  }
}
