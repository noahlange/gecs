import { Entity } from '../ecs';
import type { BaseType } from '../types';
import type { Contained, ContainedClass } from './Contained';
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
    const queries = Object.keys(this.containeds[id]);
    delete this.containers[id];
    delete this.containeds[id];
    for (const q of queries) {
      this.queries[q] = null;
    }
  }

  public has(id: string, key: string): boolean {
    return !!this.containeds[key]?.[id];
  }

  public create<T extends BaseType, C extends ContainerClass<T>>(
    Constructor: C
  ): Container<T> {
    const instance = new Constructor(this);
    if (instance instanceof Entity) {
      this.add(instance);
      return instance;
    } else {
      throw new Error(
        'Attempted to create an entity without extending the Entity class.'
      );
    }
  }

  public *query(...containeds: ContainedClass[]): Generator<Container> {
    const key = containeds.map(c => c.type).join(':');
    const ids = (this.queries[key] ??= this.items
      .filter(item => containeds.every(c => item.items.includes(c)))
      .map(item => item.id));
    for (const id of ids) {
      yield this.containers[id];
    }
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
