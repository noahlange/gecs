import type { Contained } from './Contained';
import type { Container, ContainerClass } from './Container';
import type { BaseType } from '../types';

export class Manager<T extends BaseType = BaseType> {
  protected containees: Record<string, Record<string, Contained>> = {};
  protected containers: Record<string, Container<T>> = {};

  public bindContainer(container: Container<T>): T {
    return container.items.reduce((a, b) => {
      return { ...a, [b.type]: this.containees[b.type][container.id] };
    }, {} as T);
  }

  public get items(): Container<T>[] {
    return Object.values(this.containers);
  }

  public has(id: string, key: string): boolean {
    return !!this.containees[key]?.[id];
  }

  public create<V extends T>(Container: ContainerClass<V>): Container<V> {
    const container = new Container((this as unknown) as Manager<V>);
    this.containers[container.id] = container;
    for (const Contained of container.items) {
      const type = Contained.type;
      this.containees[type] = {
        ...(this.containees[type] ?? {}),
        [container.id]: new Contained(container)
      };
    }
    return container;
  }
}
