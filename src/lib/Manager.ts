import { Entity } from '../ecs';
import type { BaseType } from '../types';
import type { Contained } from './Contained';
import type { Container, ContainerClass } from './Container';

export class Manager {
  protected _isInit: boolean = false;
  public containers: Record<string, Container> = {};
  public containeds: Record<string, Record<string, Contained>> = {};
  public queries: Record<string, string[] | null> = {};
  public ids: string[] = [];

  protected invalidateQueries(type: string): void {
    for (const key of Object.keys(this.queries)) {
      if (key.split(':').includes(type)) {
        delete this.queries[key];
      }
    }
  }

  public bind<T extends BaseType<Contained>>(container: Container): T {
    // type system abuse
    return container.items.reduce((a, b) => {
      return { ...a, [b.type]: this.containeds[b.type][container.id] };
    }, {} as T);
  }

  public get items(): Container[] {
    return this.ids.map(id => this.containers[id]);
  }

  public destroy(id: string): void {
    this.ids.splice(this.ids.indexOf(id), 1);
    const queries = Object.keys(this.containeds[id]);
    delete this.containers[id];
    delete this.containeds[id];
    for (const q of queries) {
      this.queries[q] = null;
    }
  }

  public create<T extends BaseType, C extends ContainerClass<T>>(
    Constructor: C
  ): Container<T> {
    const instance = new Constructor(this);
    if (instance instanceof Entity) {
      return instance;
    } else {
      throw new Error(
        'Attempted to create an entity without extending the Entity class.'
      );
    }
  }

  public query(
    contains: string[] = [],
    notContains: string[] = []
  ): Container[] {
    const has = contains.sort((a, b) => a.localeCompare(b));
    const hasnt = notContains.sort((a, b) => a.localeCompare(b));
    const qid = [has.join('+'), hasnt.join('-')].join(':');
    return (this.queries[qid] ??= this.ids.filter(id => {
      return (
        notContains.every(type => !(id in this.containeds[type])) &&
        contains.every(type => id in this.containeds[type])
      );
    })).map(id => this.containers[id]);
  }

  public add(container: Container): this {
    this.ids.push(container.id);
    this.containers[container.id] = container;
    for (const Contained of container.items ?? []) {
      const type = Contained.type;
      this.containeds[type] = {
        ...(this.containeds[type] ?? {}),
        [container.id]: new Contained(container)
      };
      // invalidate cached queries
      this.invalidateQueries(type);
    }
    container.init?.();
    return this;
  }

  public init(): void {
    for (const item of this.items) {
      item.init?.();
    }
    this._isInit = true;
  }
}
