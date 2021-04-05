# tecs

**tecs** (_tecks_) is an experimental entity-component-system framework thing written in [TypeScript](https://www.typescriptlang.org).

## Installation

There isn't an NPM package because it's _way_ too soon for that. If you want to mess around with a demo, there's an [example repository](https://github.com/noahlange/tecs-example).

If you'd like to fiddle with the library itself:

```
git clone https://github.com/noahlange/tecs.git && cd tecs
npm install && npm run build && npm link
```

Then you can `npm link` to it from the example project and import.

```ts
import { Entity, Component, System } from 'tecs';
```

## Entities & Components

An Entity is a loose wrapper around an arbitrary collection of Components.

Each component extends the `Component` class and must define a static `type` property. This property should be `readonly`, defined in an accessor or otherwise annotated `as const`, or TypeScript won't be able to resolve its name.

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

By passing a series of component classes to the entity's static `with()` method, you can declaratively define the structure of your entity. The static `type` property of each component class serves as the key by which the component can be accessed from its containing entity.

```ts
import { Component, Entity } from 'tecs';

export class Foo extends Component {
  // this component is accessed via `foobly`
  public static readonly type = 'foobly';
  public value: string = '1';
}

export class Bar extends Component {
  // this component is accessed via `woobly`
  public static readonly type = 'woobly';
  public value: number = 1;
}
```

An entity's component instances can be accessed via the `$` property.

```ts
import { Entity } from 'tecs';
import { Foo, Bar } from './components';

const MyEntity = Entity.with(Foo, Bar);

const e = new MyEntity();

e.$.foobly instanceof Foo; // true
e.$.foobly.value === '1'; // true

e.$.woobly instanceof Bar; // true
e.$.woobly.value === 1; // true
```

As above, you can `extend` the result of the `with()` call to create a custom entity class, or create new instances using the return value as-is.

There are two ways to create Entity classes: using the returned constructor as-is or `extend`-ing the result of the `with()` call.

```typescript
const MyEntity1 = Entity.with(Position, Sprite);
class MyEntity2 extends Entity.with(Position, Sprite) {}
```

This is a trade-off; while the first is terser and discourages the addition of custom functionality to your entities, typing the corresponding entity instance is slightly more obnoxious.

```typescript
type InstanceMyEntity1 = InstanceType<typeof MyEntity>;
type InstanceMyEntity2 = MyEntity2;
```

Sometimes you'll need to hint an entity's type without a concrete instance on hand.

```typescript
export type SpritePositionEntity = EntityType<[typeof Position, typeof Sprite]>;

function usingSpritePosition(entity: SpritePositionEntity): void {
  entity.$.position.x += 1;
  entity.$.position.y += 1;
}
```

## Worlds & Systems

The relationship between the `World` and its `Systems` parallels that of an `Entity` and its `Components`. A `World` serves as a container for an arbitrary number of `Systems`, each of which performs a single, well-defined task that operates across numerous entities.

The key functionality of a System is executed within its `init()` and `tick()` methods. While both methods are technically optional, every system will have at least one. Some run once or twice—map generation, for example—while others might run on every tick and have no initialization code to speak of.

An example implementation of a simple PIXI.js renderer:

```typescript
import * as PIXI from 'pixi.js';
import { System } from 'tecs';

import { Sprite, Position, Player } from './components';

class Renderer extends System {
  public static readonly type = 'renderer';

  protected sprites: Record<string, PIXI.Sprite> = {};

  // constructing queries takes time; a persisted query has less overhead when called repeatedly.
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
world.query.some.components(A, B).all.tags('one', 'two'); // (A | B) & ('one' & 'two')
```

Query steps can be modified with `.all`, `.any` and `.none` to perform basic boolean operations. `.some` expands the query result's type signature with additional (optional) properties, but has no effect on the query's results. `.none` has no effect on the query's type signature, but does have an effect on its results.

```typescript
// the "all" is implicit for tags/components
world.query.all.components(A, B); // A & B
world.query.components(A, B); // A & B

world.query.any.components(A, B); // (A | B) | (A & B)
world.query.some.components(A, B); // A? | B?
world.query.none.components(A, B); // !(A | B)
```

Naturally, these can be chained:

```typescript
world.query.components(A, B)
  .some.components(C);
  .none.components(D); // A & B & C? & !D
```

## Serialization

Being able to export the game state to a serializable format and reloading it later is important. And since that is the case, it's also intended to be pretty straightforward.

You can customize the serialization output of a component by adding a `toJSON()` method. You can pair this with a setter to populate a component's "exotic" properties upon instantiation.

```ts
class Health extends Component {
  public health = new MyHealth(100);

  // return "$" on save...
  public toJSON() {
    return {
      $: {
        value: this.health.value,
        max: this.health.max
      }
    };
  }

  // ...set via "$" on load
  public set $(value) {
    this.health.setValue($.value);
    this.health.setMax($.max);
  }
}
```

The output is a pretty bulky POJO—~2000 entities runs me about 650 KB—but compressing the stringified output with [Brotli](https://www.npmjs.com/package/brotli) brings it down to less than 20 KB, which should be plenty small.

### Save

```typescript
// create and start the world
const world = new World();
await world.start();

// dump to POJO, convert to string
const toStringifyOrCompressOrWhatever = world.save();
```

### Load

```typescript
// instantiate new world and reload state
const world = new World();
world.load(toStringifyOrCompressOrWhatever);

// start world
await world.start();
```

In order to properly reload the world state, you'll need to manually register your components (and any custom entities) before calling `load()`.

---

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: Somewhere between "not great" and "bad," but particularly good performance was never one of the primary design goals. So long as it remains capable of 60 FPS+, features are (currently) a higher priority than performance improvements.

**Q/S**: But _how_ bad, exactly?  
**A/R**: Hovers around the bottom third of [ecs-benchmark](https://github.com/noctjs/ecs-benchmark) and ddmills' [js-ecs-benchmarks](https://github.com/ddmills/js-ecs-benchmarks).

**Q/S**: After reading the code, I realize this manages to be even less type-safe than I would have thought possible.  
**A/R**: Also yes. But again, this is all about ergonomics and my feelings.
