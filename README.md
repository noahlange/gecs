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

An entity's component instances can be accessed via the `$` property. The static `type` property of each component class serves as the key by which the component can be accessed from its containing entity.

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
    this.$.foobly.value = '???'
    this.$.woobly = { value: 2 }
  }
}
```

As above, you can `extend` the result of the `with()` call to create a custom entity class, or create new instances using the return value as-is.

There are two ways to create Entity instances: `extend`ing the result of the `with()` call or using the returned constructor as-is. In practice, the latter is often preferable—you don't want to get in the habit of putting significant amounts of logic into your entities.

```typescript
const MyEntity1 = Entity.with(Position, Sprite);
class MyEntity2 extends Entity.with(Position, Sprite) {}
```

Sometimes you'll need the entity's instance type—even if you don't have a concrete object on hand.

```typescript
export type MyEntityInstance = EntityType<[typeof Position, typeof Sprite]>;
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

  // constructing an ad-hoc query takes time; a persisted query has less overhead when called repeatedly.
  protected query = this.world.query.components(Position, Sprite).persist();

  public tick(delta: number, time?: number): void {
    for (const { $ } of this.query) {
      const child = this.sprites[$.sprite.id];
      if (child) {
        // update position and rotation
        child.position = new PIXI.Point($.position.x, position.y);
        child.r = $.position.r;
      }
    }
  }

  // init() functions can be async
  public async init(): Promise<void> {
    this.app = new PIXI.Application();
    const query = this.world.query.all.components(Sprite);
    // create all sprites and add to the stage
    for (const { $ } of query) {
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

When the world's (async) `start()` method is invoked, each of the world's systems is booted in the order it was passed to `with()`. Each time `tick()` is called, the world invokes the `tick()` method of each of its systems (again, in order).

## Queries

Queries return collections of entities based on the user's criteria. Query results are typed exactly like an ordinary entity, so you'll have access to each of the components you've requested in your query—and nothing more.

Queries consist of one or more "steps," each corresponding to a different type of query— components, tags or entities.

```typescript
const q1 = world.query.components(A, B);
const q4 = world.query.tags('one', 'two', 'three');
const q2 = world.query.entities(MyEntity);
```

Steps are executed sequentially. The result of a query is the intersection of each step's results.

```typescript
world.query.some.components(A, B).all.tags('one', 'two');

// (A | B) & ('one' & 'two')
```

Query steps can be modified with `.all`, `.any` and `.none` to perform basic boolean operations. `.some` expands the query result's type signature with additional (optional) properties, but has no effect on the contents of the query.

```typescript
// the "all" is implicit for tags/components
const q1a = world.query.all.components(A, B); // A & B
const q1b = world.query.components(A, B); // A & B

const q2 = world.query.any.components(A, B); // A | B
const q3 = world.query.some.components(A, B); // A? | B?
const q4 = world.query.none.components(A, B); // !(A | B)
```

By default, queries aren't refreshed until the end of the tick. If you'd like to access entities added/removed during the current tick, you can use the `created` and `removed` modifiers.

```typescript
const q1 = world.query.added.components(A, B);
const q2 = world.query.removed.components(A, B);
```

Of course, mutation queries can use the aforementioned modifiers.

```typescript
const q1 = world.query.added.all.components(A, B); // ΔA & ΔB
const q2 = world.query.removed.any.components(A, B); // ΔA | ΔB
```

---

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: Somewhere between "not great" and "bad" but it was never one of the primary design goals. So long as it remains capable of 60 FPS+, features are (currently) a higher priority than performance fixes.

**Q/S**: But _how_ bad, exactly?
**A/R**: Hovers around the bottom third of [ecs-benchmark](https://github.com/noctjs/ecs-benchmark) and ddmills' [js-ecs-benchmarks](https://github.com/ddmills/js-ecs-benchmarks).

**Q/S**: After reading the code, I realize this manages to be even less type-safe than I would have thought possible.  
**A/R**: Also yes. But again, this is all about ergonomics and my feelings.
