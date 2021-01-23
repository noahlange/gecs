# tecs

**tecs** (_tecks_) is an experimental entity-component-system framework thing written in [TypeScript](https://www.typescriptlang.org). There are a lot of these written for various JS runtimes (particular shout-out goes to [ecsy](https://ecsy.io/), from which this takes quite a bit of inspiration), but the ones I read felt kinda clunky. Lots of tedious method chaining, &c.

What about something a little terser, and with TypeScript integration?

The idea seemed promising, so I sketched out the code I wanted to write and then tried to figure out how to make it work; this is the result.

## Containers & Containees

The whole thing boils down to two basic types: the `Container<T>` and the `Containee`.

A `Containee` is a class constructor with a unique, read-only property named `type` that holds its human-readable name.

```typescript
class FooThing {
  public static readonly type = 'foo';
}
```

A `Container<T>` contains containees. A container's containees can be accessed in the container's `$` property, as keyed by the containee constructor's `type` property. In other words:

```typescript
import { Container, FooThing, BarThing } from './';

interface Containees {
  foo: FooThing;
  bar: BarThing;
}

const container = new Container<Containees>();

container.$.foo instanceof FooThing; // true
container.$.bar instanceof BarThing; // true
```

_"Wow, writing a different type signature for every theoretical combination of containees seems like it'd be an enormous pain!"_, one might say.

I would agree. But with a bit of trickery and flagrant abuse of type assertions, we can skirt around this obstacle and come up with something that is clean, terse and nicely type-hinted.

```typescript
const FooBar = Container.from(FooThing, BarThing);
// inferred as Container<{ foo: FooThing; bar: BarThing }>

const fooBar = new FooBar();

fooBar.$.foo instanceof FooThing; // true
fooBar.$.bar instanceof BarThing; // true
```

So, now with the basic interface established, we'll shift gears over to the framework side of things. There are two "levels" of this container-containee relationship: World/Systems and Entity/Components.

## Entities & Components

An Entity contains any number of Components (logic-less chunks of data).

```typescript
export class Position extends Component {
  public static readonly type = 'position';
  public x: number = 0;
  public y: number = 0;
  public r: number = 0;
}

export class Sprite extends Component {
  public static readonly type = 'sprite';
  public anchor: number = 0.5;
  public path: string = '/assets/mole.png';
}
```

There are two ways to create Entity classes: `extend`ing the result of the `with()` call or using the returned constructor as-is.

```typescript
import { Entity } from 'tecs';
import { Position, Sprite } from './components';

const MyEntity1 = Entity.with(Position, Sprite);
class MyEntity2 extends Entity.with(Position, Sprite) {}

for (const entity of [new MyEntity1(), new MyEntity2()]) {
  myEntity.$.position instanceof Position; // true
  myEntity.$.sprite instanceof Sprite; // true
}
```

In either case, the components in `$` aren't attached to the component itself: instead, they're accessed via an entity manager, which stores the components, the entities and the relationships between them.

## Worlds & Systems

A `World` contains any number of `Systems` alongside an Entity manager. Assuming we have a `Renderer` system that does all the display-related stuff, we could do something like this to rotate our sprite.

```typescript
import { World, Entities } from 'tecs';

import { Position, Sprite } from './components';
import { Renderer } from './systems';

const MyObject = Entities.with(Position, Sprite);

export class MyWorld extends World.with(Renderer) {
  // we'd ordinarily put this in its own system
  public tick(delta: number, time?: number): void {
    // find all entities with a Position component
    for (const { $ } of this.query(Position)) {
      $.position.r = ($.position.r + 0.1) % 360;
    }
    // ...and tick
    super.tick(delta, time);
  }

  public init(): void {
    // create a mole-shaped, positionable object
    this.entities.create(MyObject);
    // invoke the world's "tick" method and execute systems
    this.$.renderer.app.ticker.add(this.tick.bind(this));
  }
}

const world = new MyWorld();
world.start();
```

Each tick, the world invokes the `tick()` method of each of its systems.
Systems operate on Entities via their Components—usually by querying the world for all entities with a particular component.

```typescript
import * as PIXI from 'pixi.js';

import { System } from 'tecs';
import { Sprite, Position } from './components';

class Renderer extends System {
  public static readonly type = 'renderer';
  public sprites: Record<string, PIXI.Sprite> = {};

  // run on tick
  public tick(delta: number, time?: number): void {
    // find all entities that have Sprite and Position components
    for (const { $ } of this.world.query().has(Position, Sprite)) {
      // update position and rotation
      const child = this.sprites[$.sprite.id];
      child.position = new PIXI.Point($.position.x, position.y);
      child.r = $.position.r;
    }
  }

  // invoked on `world.init()`
  public init(): void {
    this.app = new PIXI.Application();
    // create all sprites
    for (const { $ } of this.world.query().has(Sprite)) {
      const child = PIXI.Sprite.from($.sprite.path);
      child.anchor = $.sprite.anchor;
      this.sprites[$.sprite.id] = child;
    }
    // add sprites to stage
    for (const child of Object.values(this.sprites)) {
      this.app.stage.addChild(child);
    }
    // mount stage to DOM
    document.body.appendChild(this.app.view);
  }
}
```

---

## Questions/Statements & Answers

**Q/S**: Every implementation here appears to be as naïve as humanly possible and performance is probably god-awful.  
**A**: Yes, but I probably have plans to fix it.

**Q/S**: Why are components class instances instead of object hashes? Isn't that kinda expensive/wasteful?  
**A**: Yes, but the ergonomics make me _feel_ happier.

**Q/S**: After reading the code, I realize this manages to be even less type-safe than I would have thought possible.  
**A**: Yes. But again, this is all about my feelings.
