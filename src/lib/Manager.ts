import type { BaseType } from '../types';
import type { Contained, ContainedClass } from './Contained';
import type { Container, ContainerClass } from './Container';

export class Manager {
  public containers: Record<string, Container> = {};
  public containeds: Record<string, Record<string, Contained>> = {};

  public bind<T extends BaseType<Contained>>(container: Container): T {
    // type system abuse
    return container.items.reduce((a, b) => {
      return { ...a, [b.type]: this.containeds[b.type][container.id] };
    }, {} as T);
  }

  public get items(): Container[] {
    return Object.values(this.containers);
  }

  public has(id: string, key: string): boolean {
    return !!this.containeds[key]?.[id];
  }

  public create<T extends BaseType, C extends ContainerClass<T>>(
    Constructor: C
  ): Container<T> {
    const instance = new Constructor(this);
    this.add(instance);
    return instance;
  }

  public *query(...containeds: ContainedClass[]): Generator<Container> {
    for (const item of this.items) {
      if (containeds.every(c => c.type in item.$)) {
        yield item;
      }
    }
  }

  public add(container: Container): this {
    this.containers[container.id] = container;
    for (const Contained of container.items ?? []) {
      const type = Contained.type;
      this.containeds[type] = {
        ...(this.containeds[type] ?? {}),
        [container.id]: new Contained(container)
      };
    }
    return this;
  }

  public init(): void {
    for (const item of this.items) {
      item.init?.();
    }
  }
}
