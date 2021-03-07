import type { World } from '../';
import type { Compressed } from 'compress-json';
import { decompress } from 'compress-json';
import { eid } from '../types';
import { Entity } from '../ecs';

interface SerializedEntity {
  id: string;
  type: string;
  tags: string[];
  $: Record<string, unknown>;
}

interface Serialized {
  entities: SerializedEntity[];
}

interface Serialized {
  entities: SerializedEntity[];
}

export class Deserializer {
  protected world: World;
  protected stack: unknown[] = [];

  protected paths: Map<string, [string[], string][]> = new Map();
  protected entities: Map<string, Entity> = new Map();

  protected set(obj: object, path: string[], value: any): void {
    let next: any = obj;
    while (path.length) {
      const segment = path.shift();
      if (segment) {
        if (path.length === 0) {
          next[segment] = value;
        } else {
          next = next[segment];
        }
      }
    }
  }

  protected recreateEntityRefs(): void {
    // recreate entity references
    for (const [id, allPaths] of this.paths.entries()) {
      const entity = this.entities.get(id);
      if (entity) {
        for (const [path, ref] of allPaths) {
          this.set(entity, path, this.entities.get(ref));
        }
      }
    }
  }

  protected deserializeValue(path: string[], id: string, value: any): any {
    const paths = this.paths;
    const stack = this.stack;

    const p = path.slice();
    let res: unknown | undefined = value;
    stack.push(value);
    switch (typeof value) {
      case 'object': {
        if (Array.isArray(value)) {
          res = value.map((item, i) => {
            const next = p.concat([i + '']);
            return this.deserializeValue(next, id, item);
          });
        } else if (value) {
          for (const key of Object.getOwnPropertyNames(value)) {
            const next = value[key];
            const nextPath = p.concat([key]);
            if (!stack.includes(next)) {
              res = next ? this.deserializeValue(nextPath, id, next) : next;
            }
          }
        }
        break;
      }
      case 'string': {
        if (value.startsWith(eid)) {
          const ref = value.replace(`${eid}|`, '');
          const arr = paths.get(id) ?? [];
          arr.push([p, ref]);
          paths.set(id, arr);
          res = value;
        }
        // recreate BigInts
        if (/^[0-9]+n$/.test(value)) {
          res = BigInt(value.slice(0, -1));
        }
        break;
      }
    }
    stack.pop();
    return res;
  }

  public deserialize(save: Compressed): void {
    const parsed: Serialized = decompress(save);
    const entities = this.world.constructors.entities;

    for (const { id, tags, type, $ } of parsed.entities) {
      // if the entity class hasn't been registered or doesn't exist, we'll recreate the prefab manually.
      if (!(type in entities)) {
        const EntityClass = Entity.with(
          ...type.split('|').map(c => this.world.constructors.components[c])
        );
        this.world.register(EntityClass);
        entities[type] = EntityClass;
      }

      const data = Object.getOwnPropertyNames($).map(key =>
        this.deserializeValue(['$', key], id, $[key])
      );

      // now we know the entity class exists
      const e = this.world.create(entities[type], data, tags);
      // @ts-ignore: we do want it to be read-only, but this is a special case
      e.id = id;
      this.entities.set(id, e);
    }

    this.recreateEntityRefs();
  }

  public constructor(world: World) {
    this.world = world;
  }
}
