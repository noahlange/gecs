# tecs

**tecs** (_tecks_) is an experimental entity-component-system framework thing written in [TypeScript](https://www.typescriptlang.org). There are a lot of these written for various JS runtimes (particular shout-out goes to [ecsy](https://ecsy.io/), from which this takes quite a bit of inspiration), but the ones I read felt kinda clunky. Lots of tedious method chaining, &c.

What about something a little terser, and with TypeScript integration?

The idea seemed promising, so I sketched out the code I wanted to write and then tried to figure out how to make it actually work; this is the result.

## Containers & Containees

The whole thing boils down to two basic types: a `Containee` and a `Container<T>`.

A `Containee` is a class constructor with a unique, read-only property named `type` that holds its human-readable name.

```typescript
class FooThing {
  public static readonly type = 'foo';
}
```

A `Container<T>` contains containees. A container's containees can be accessed in the container's `$` property by the containee's `type`. A long-winded definition:

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

I would agree. But with a bit of trickery and flagrant abuse of TypeScript's type assertions, we can skirt around this obstacle and come up with something that is clean, terse and nicely type-hinted.

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

```typescript
import { Entity } from 'tecs';
import { Position, Sprite } from './components';

const MyEntity = Entity.with(Position, Sprite);
const myEntity = new MyEntity();

myEntity.$.position instanceof Position; // true
myEntity.$.sprite instanceof Sprite; // true
```

## Worlds & Systems

A World contains any number of Systems and an array of Entities.

```typescript
import { World } from 'tecs';
import { MyObject } from './entities';
import { Renderer } from './systems';

export class MyWorld extends World.with(Renderer) {
  public start(): void {
    // create a mole-shaped, positionable object
    const myObject = new MyObject();
    // @todo - find better syntax
    this.entities.push(myObject);

    // invoke the world's "tick" method and execute systems
    this.$.renderer.app.ticker.add(delta => {
      // spin...
      const r = myObject.$.position.r;
      myObject.$.position.r = (r + 0.1) % 360;
      // ...and tick.
      this.tick(delta);
    });
  }
}

const world = new MyWorld();

world.init();
world.start();
```

Each tick, the world invokes the `execute()` method of each of its systems.
Systems operate on Entities via their Components—usually by querying the world for all entities with a particular component.

```typescript
import * as PIXI from 'pixi.js';

import { System } from 'tecs';
import { Sprite, Position } from './components';

class Renderer extends System {
  public static readonly type = 'renderer';
  public sprites: Record<string, PIXI.Sprite> = {};

  // run on tick
  public execute(delta: number, time?: number): void {
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

**Q/S**: Every implementation here appears to be maximally naïve and performance is probably god-awful.  
**A**: Yes, but I do have plans to fix it.

**Q/S**: Why are components class instances instead of object hashes? Isn't that kinda expensive/wasteful?  
**A**: Yes, but the ergonomics make me _feel_ happier.

**Q/S**: After reading the code, I realize this manages to be less type-safe than I would have even thought possible.  
**A**: Yes. But again—_this is all about my feelings_.
