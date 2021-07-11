import type { Context } from '../ecs/Context';
import type { EntityClass } from '../ecs/Entity';
import type { $AnyEvil, $AnyOK, Plugins, Serialized } from '../types';

import { Entity } from '../ecs/Entity';
import { eid } from '../types';

export class Deserializer<T extends Plugins<T>> {
  protected ctx: Context<T>;
  protected stack: unknown[] = [];

  /**
   * A mapping of EntityIDs to an array of `[path, entityID]`.
   * ```
   * {
   *    1: [ ['foo','bar'], 123 ], // { id: 1, foo: { bar: Entity123 } }
   *    2: [ ['bar','baz'], 456 ]  // { id: 2, bar: { baz: Entity456 }}
   * }
   * ```
   */
  protected refs: Record<string, [string[], string][]> = {};
  protected entities: Record<string, Entity> = {};

  /**
   * Given an object, array of string path segments and an arbitrary value,
   * assign the value. Basically a naïve implementation of lodash's `_.set()`
   */
  protected set(obj: object, path: string[], value: $AnyOK): void {
    let next: $AnyEvil = obj;
    while (path.length) {
      const segment = path.shift();
      if (segment) {
        if (path.length) {
          next = next[segment];
        } else {
          next[segment] = value;
        }
      }
    }
  }

  protected recreateEntityReferences(): void {
    for (const [id, paths] of Object.entries(this.refs)) {
      const entity = this.entities[id];
      // get a reference to the newly-recreated entity
      for (const [path, ref] of paths) {
        // ...and assign it
        this.set(entity.$, path, this.entities[ref]);
      }
    }
  }

  protected deserializeInPlace(
    path: string[],
    id: string,
    value: $AnyOK
  ): $AnyOK {
    const { refs, stack } = this;
    let res: unknown | undefined = value;
    stack.push(value);

    switch (typeof value) {
      case 'object': {
        if (Array.isArray(value)) {
          res = value.map((item, i) => {
            const next = path.concat([i + '']);
            return this.deserializeInPlace(next, id, item);
          });
        } else if (value) {
          // iterate through the object...
          for (const key of Object.getOwnPropertyNames(value)) {
            // getting our value and an extended path
            const [next, nextPath] = [value[key], [...path, key]];
            if (!stack.includes(next)) {
              // ensure we aren't going to blow the stack with a circular reference before attempting to deserialize
              this.set(
                res as object,
                [key],
                next ? this.deserializeInPlace(nextPath, id, next) : next
              );
            }
          }
        }
        break;
      }
      case 'string': {
        if (value.startsWith(eid)) {
          const ref = value.replace(`${eid}|`, '');
          // we're going to need to re-link references to this entity
          const paths = refs[id] ?? [];
          paths.push([path, ref]);
          refs[id] = paths;
          res = null;
        }
        // recreate BigInts if necessary
        if (/^[0-9]+n$/.test(value)) {
          res = BigInt(value.slice(0, -1));
        }
        // otherwise, it's just a bog-standard string
        break;
      }
      // fall through for everything else: booleans, numbers, nulls, etc.
    }
    stack.pop();
    return res;
  }

  protected deserializeEntities(save: Serialized): void {
    const { components, entities } = this.ctx.manager.registrations;
    const toRegister: Record<string, EntityClass> = {};
    const toRecreate = [];

    for (const { id, tags, type, $ } of save.entities) {
      // if the entity class hasn't been registered or doesn't exist, we'll recreate the prefab manually.
      if (!(type in entities)) {
        const types = type.split('|');
        const missing = types.filter(c => !components[c]);
        if (missing.length) {
          console.warn(`Missing entities/components: ${missing.join(', ')}`);
          continue;
        }
        entities[type] = toRegister[type] = Entity.with(
          ...type.split('|').map(c => components[c])
        );
      }

      // now that we're confident that the entity class exists, we're going to populate data for `ctx.create()`

      for (const key of Object.getOwnPropertyNames($)) {
        $[key] = this.deserializeInPlace([key], id, $[key]);
      }
      toRecreate.push({ id, entity: entities[type], data: $, tags });
    }

    // register components
    this.ctx.register(Object.values(toRegister));

    // ...and instantiate
    for (const { id, entity, data, tags } of toRecreate) {
      // track the entity ID and a reference so we can repopulate refs later, if needed
      const e = (this.entities[id] = this.ctx.create(entity, data, tags));
      // @ts-ignore: we _do_ want it to be read-only, but this is a special case
      e.id = id;
    }

    // now that we've recreated all our entities, we can properly swap in references
    this.stack = [];
    this.recreateEntityReferences();
    this.stack = [];
  }

  public deserialize(save: Serialized): void {
    this.deserializeEntities(save);
  }

  public constructor(ctx: Context<T>) {
    this.ctx = ctx;
  }
}
