import type { BaseType } from '../types';
import type { Contained } from './Contained';
import type { Container } from './Container';

export class Manager {
  protected containeds: Record<string, Record<string, Contained>> = {};
  protected containers: Record<string, Container> = {};

  public bindContainer<T extends BaseType>(container: Container<T>): T {
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

  public add(container: Container): this {
    this.containers[container.id] = container;
    for (const Contained of container.items) {
      const type = Contained.type;
      this.containeds[type] = {
        ...(this.containeds[type] ?? {}),
        [container.id]: new Contained(container)
      };
    }
    return this;
  }
}
