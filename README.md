# tecs

**tecs** (_tecks_) is an experimental entity-component-system framework thing written in [TypeScript](https://www.typescriptlang.org).

## Installation

There isn't an NPM package because it's _way_ too soon for that. If you want to mess around with a small demo, there's an [example repository](https://github.com/noahlange/tecs-example).

If you'd like to fiddle with the library itself:

```
git clone https://github.com/noahlange/tecs.git && cd tecs
npm install && npm run build && npm link
```

Then you can `npm link` to it from the example project and import.

```ts
import { Entity, Component, System } from 'tecs';
```

## Inspiration

There are a lot of ECS frameworks written for various JS runtimes (particular shout-out goes to [ecsy](https://ecsy.io/), from which this takes quite a bit of inspiration), but the ones I read felt kinda clunky. Lots of tedious method chaining (`.addComponent(Foo).addComponent(Bar)`), while still requiring substantial programmer attention to the data structures being passed around.

So how about something a little terser and more declarative, and with TypeScript integration? That idea seemed promising, so I sketched out the code I wanted to write and then tried to figure out how to make it work; this is the result.

## Entities & Components

An Entity is a loose wrapper around an arbitrary collection of Components.

Each component extends the `Component` class and must define a static `type` property. This property should also be readonly, or TS won't be able to resolve the name of the Component.

```typescript
export class Position extends Component {
  public static readonly type = 'position';
  // instance properties...
  public x: number = 0;
  public y: number = 0;
  public r: number = 0;
}

export class Sprite extends Component {
  public static readonly type = 'sprite';
  // instance properties...
  public anchor: number = 0.5;
  public path: string = '/assets/mole.png';
}
```

By passing a series of component classes to the entity's static `with()` method, you can declaratively define the structure of your entity.

An entity's component instances can be accessed using the `$` or `$$` properties—returning immutable and mutable instances of the component, respectively. The static `type` property of each component class serves as the key by which the component can be accessed from its containing entity.

```js
import { Component, Entity } from 'tecs';

export class Foo extends Component {
  // this component is accessed via `foobly`
  public static readonly type = 'foobly';
  public value: string = '1';
}

export class Bar extends Component {
  // this component is accessed via `woobly`
  public static readonly type = 'woobly';
  public value: number = 1
}

class MyEntity extends Entity.with(Foo, Bar) {
  public myMethod() {
    // components accessed by key defined in `type`
    this.$.foobly.value = '???' // cannot assign to read-only property
    this.$$.woobly.value = 2; // component marked as changed
  }
}
```

As above, you can `extend` the result of the `with()` call to create a custom entity class, or create new instances using the return value as-is.

There are two ways to create Entity instances: `extend`ing the result of the `with()` call or using the returned constructor as-is. In practice, the latter is often preferable—you don't want to get in the habit of putting significant amounts of logic into your entities.

```typescript
const MyEntity1 = Entity.with(Position, Sprite);
class MyEntity2 extends Entity.with(Position, Sprite) {}
```

## Worlds & Systems

The relationship between the `World` and its `Systems` parallels that of an `Entity` and its `Components`. A `World` serves as a container for an arbitrary number of `Systems`, each of which performs a single, well-defined task that operates across numerous entities.

The key functionality of a System is executed within its `init()` and `tick()` methods. While both methods are technically optional, nearly every system will have at least one. Some run once or twice—map generation, for example—while others might run on every tick and have no initialization code to speak of.

An example implementation of a simple PIXI.js renderer:

```typescript
import * as PIXI from 'pixi.js';
import { System } from 'tecs';

import { Sprite, Position, Player } from './components';

class Renderer extends System {
  public static readonly type = 'renderer';

  protected sprites: Record<string, PIXI.Sprite> = {};

  public tick(delta: number, time?: number): void {
    // find all updated entities with Sprite and Position components
    const query = this.world.query.changed(Position, Sprite);
    for (const { $ } of query) {
      const child = this.sprites[$.sprite.id];
      if (child) {
        // update position and rotation
        child.position = new PIXI.Point($.position.x, position.y);
        child.r = $.position.r;
      }
    }
  }

  // init functions can be async
  public async init(): Promise<void> {
    this.app = new PIXI.Application();
    // create all sprites and add to the stage
    for (const { $ } of this.world.query.with(Sprite)) {
      const child = PIXI.Sprite.from($.sprite.path);
      child.anchor = $.sprite.anchor;
      this.sprites[$.sprite.id] = child;
      this.app.stage.addChild(child);
    }
    // bind the world's "tick" method to PIXI's ticker
    this.app.ticker.add(this.world.tick.bind(this.world));
    // mount stage to DOM
    document.body.appendChild(this.app.view);
  }
}
```

Like an entity is created `with()` components, a world is created `with()` systems.

```typescript
import { World, Entity } from 'tecs';

import { Renderer } from './systems';

class MyWorld extends World.with(Renderer) {
  public init(): void {
    console.log('initializing!');
  }
}

(async () => {
  const world = new MyWorld();
  await world.start();
})();
```

When the world's `start()` method is invoked, each of the world's systems is booted in the order it was passed to `with()`.

Each time `tick()` is called, the world invokes the `tick()` method of each of
its systems (again, in order).

## Queries

The entity manger handles all the relationships between entities and their components. When you access `$` on an entity, variable access is being proxied through the manager—every component is stored in the same place.

Queries return collections of entities based on a user's requirements. The results of queries are typed exactly like the ordinary entity's `$` property, so you'll have access to each of the components you've requested in your query—and nothing more.

They're pretty minimal and naïve, otherwise. Access the world's `.query` getter to get a new Query, and call `with()` or `without()` as needed to pare down the component selection. Adding the same component using both `with()` and `without()` will return nothing without warning.

`changed()` adds the additional restriction of an entity having been created or modified since the last `changed()` query.

---

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: Honestly, not great. It's a work in progress.

|                | ecsy | ape-ecs | tecs  |
| :------------- | :--: | :-----: | :---: |
| Create 50k, 2x | 80ms |  300ms  | 375ms |
| Modify 50k, 2x | 6ms  |   7ms   | 150ms |

**Q/S**: After reading the code, I realize this manages to be even less type-safe than I would have thought possible.  
**A**: Also yes. But again, this is all about ergonomics and my feelings.
