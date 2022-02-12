import type { Context } from '../ecs';
import type {
  Plugins,
  Serialized,
  SerializedEntity,
  SomeDictionary,
  Visited,
  Visiting
} from '../types';

import { Entity } from '../ecs/Entity';
import { anonymous, eid } from '../types';

export interface SerializeOptions {
  entityFilter?: (entity: Entity) => boolean;
}

export class Serializer<T extends Plugins<T>> {
  // make sure we aren't recursing infinitely through circular references
  protected stack: unknown[] = [];
  protected ctx: Context<T>;

  /**
   * Convert the context into a structure we can stringify and save to disk
   */
  public serialize(options: SerializeOptions = {}): Serialized {
    return {
      entities: this.serializeEntities(options)
    };
  }

  protected visit<O extends SomeDictionary = {}>(obj: O): SomeDictionary {
    const res: SomeDictionary = {};
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

  protected serializeEntities(options: SerializeOptions): SerializedEntity[] {
    this.stack = [];
    const filter = options.entityFilter ?? (() => true);
    const entities = this.ctx.manager.index
      .all()
      .map(id => this.ctx.manager.entities[id])
      .filter(f => f && filter(f));

    const res = entities.map(entity => {
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
    });

    this.stack = [];
    return res;
  }

  public constructor(ctx: Context<T>) {
    this.ctx = ctx;
  }
}
