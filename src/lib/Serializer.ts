import type { Serialized, SomeHash, Visited, Visiting } from '../types';
import type { Manager } from './Manager';

import { Entity } from '../ecs';
import { anonymous, eid } from '../types';

interface SerializeOptions {
  entityFilter?: (entity: Entity) => boolean;
}

export class Serializer {
  // make sure we aren't recursing infinitely through circular references
  protected stack: unknown[] = [];
  protected entities: Entity[] = [];

  protected visit<O extends SomeHash = {}>(obj: O): SomeHash {
    const res: SomeHash = {};
    for (const key of Object.getOwnPropertyNames(obj)) {
      const val = this.serializeValue(obj[key]);
      if (val !== undefined) {
        res[key] = val;
      }
    }
    return res;
  }

  protected serializeValue(value: Visiting): Visited {
    let res: Visited = value;
    this.stack.push(value);

    switch (typeof value) {
      case 'object': {
        if (Array.isArray(value)) {
          res = value.map(item =>
            typeof item === 'object'
              ? item
                ? this.visit(item)
                : item
              : this.serializeValue(item)
          );
        } else if (value) {
          if (value.toJSON) {
            res = value.toJSON();
          } else {
            // `null` being a legal alternative here...
            if (value instanceof Entity) {
              // create an entity reference so we can re-link it on load
              res = [eid, value.id].join('|');
            } else {
              for (const key of Object.getOwnPropertyNames(value)) {
                const next = value[key];
                if (!this.stack.includes(next)) {
                  value[key] = next ? this.serializeValue(next) : next;
                }
              }
            }
          }
        }
        break;
      }
      case 'bigint':
        res = `${value}n`;
        break;
      case 'number':
      case 'string':
      case 'boolean': {
        res = value;
        break;
      }
    }

    this.stack.pop();
    return res;
  }

  /**
   * Convert the context into a structure we can stringify and save to disk
   */
  public serialize(options: SerializeOptions = {}): Serialized {
    const entityFilter = options.entityFilter ?? (() => true);
    this.stack = [];
    const save: Serialized = {
      entities: this.entities.filter(entityFilter).map(entity => {
        const type =
          // if the class is anonymous (i.e., not `extend`ed), we'll give it a
          // name so we can recreate it properly. since, by definition, it cannot
          // have any custom functionality, we don't have to worry about losing
          // access to class methods, etc.
          !entity.constructor.name || entity.constructor.name === anonymous
            ? entity.items.map(e => e.type).join('|')
            : // but if it is named, we want to track that.
              entity.constructor.name;

        return {
          id: entity.id,
          type,
          tags: Array.from(entity.tags),
          $: this.visit(entity.$)
        };
      })
    };

    this.stack = [];

    return save;
  }

  public constructor(manager: Manager) {
    this.entities = manager.index.all();
  }
}
