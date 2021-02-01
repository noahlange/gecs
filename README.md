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

## Containers & Containees

The whole thing boils down to two basic types: the `Container<T>` and the `Containee`.

A `Containee` is a class constructor with a unique, read-only property named `type` that holds its human-readable name.

```typescript
class FooThing {
  public static readonly type = 'foo';
}
```

A `Container<T>` contains containees. A container's containees can be accessed in the container's `$` (mutable) and `$$` (immutable) properties, as keyed by the containee constructor's `type` property. In other words:

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
const FooBar = Container.with(FooThing, BarThing);
// inferred as Container<{ foo: FooThing; bar: BarThing }>

const fooBar = new FooBar();

fooBar.$.foo instanceof FooThing; // true
fooBar.$.bar instanceof BarThing; // true
```

So, now with the basic interface established, we'll shift gears over to the framework side of things. Within **tecs**, there are are two "levels" of this container-containee relationship: World/Systems and Entity/Components.

## Entities & Components

An Entity contains any number of Components (logic-less chunks of data, each tagged with their own `type`).

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

There are two ways to create Entity classes: `extend`ing the result of the `with()` call or using the returned constructor as-is.

```typescript
import { Entity } from 'tecs';
import { Position, Sprite } from './components';

// "MyEntity1" is a class constructor
const MyEntity1 = Entity.with(Position, Sprite);

// ooh, arrays of components!
class MyEntity2 extends Entity.with(Position, Sprite) {}

const [entity1, entity2] = [new MyEntity1(), new MyEntity2()];
// components in place
entity1.$.position instanceof Position; // true
entity2.$.sprite instanceof Sprite; // true
```

In either case, the components in `$` aren't attached to the component itself: instead, they're accessed via an entity manager, which stores the components, the entities and the relationships between them.

## Worlds & Systems

A `World` contains any number of `Systems` (and an Entity manager). The world serves as the point of connection between systems and entities.

On `start()`, the world invokes the `init()` function of itself and all its systems (if defined).

```typescript
import { World, Entities } from 'tecs';

import { Position, Sprite, Stat } from './components';
import { Renderer } from './systems';

const MyObject = Entities.with(Position, Sprite, [Stat, Stat]);

export class MyWorld extends World.with(Renderer) {
  public init(): void {
    // create a visible, positionable object with a single stat: "gumption"
    // pass component data as a second param, patterning after `$`
    this.create(MyObject, {
      sprite: { anchor: 1 },
      stat: { name: 'gumption', value: 1 }
    });
  }

  // for demo purposes; we'd ordinarily put this logic in its own system
  public tick(delta: number, time?: number): void {
    // query for specific numbers and configurations of components
    for (const { $ } of this.query.with(Stat)) {
      // $: read-only component
      console.log($.stat);
    }

    // find all entities with a Position component
    for (const { $$ } of this.query.with(Position)) {
      // $$: read/write component
      $$.position.r = ($$.position.r + 0.1) % 360;
    }

    // ...make sure to invoke super.tick() if you're going to override it
    super.tick(delta, time);
  }
}

const world = new MyWorld();
world.start();
```

Each time `tick()` is called, the world invokes the `tick()` method of each of
its systems (again, if defined). Most systems will have a `tick()` method, but
it's not _strictly_ necessary, and it might make sense to sequester particular
bits of entity creation to dedicated systems within an `init()` function and
ignore `tick()` entirely.

Systems operate on Entities via their Components—usually by querying the world
for all entities with/without particular combinations of components.

```typescript
import * as PIXI from 'pixi.js';

import { System } from 'tecs';
import { Sprite, Position, Player } from './components';

class Renderer extends System {
  public static readonly type = 'renderer';

  public sprites: Record<string, PIXI.Sprite> = {};

  // run on tick
  public tick(delta: number, time?: number): void {
    // find all entities that have Sprite and Position components, but not a Player
    const query = this.world.query.with(Position, Sprite).without(Player);
    for (const { $ } of query) {
      const child = this.sprites[$.sprite.id];
      if (child) {
        // update position and rotation
        child.position = new PIXI.Point($.position.x, position.y);
        child.r = $.position.r;
      }
    }
  }

  // invoked on `world.init()`
  public init(): void {
    this.app = new PIXI.Application();
    // bind the "tick" method to PIXI's ticker
    this.app.ticker.add(this.world.tick.bind(this.world));

    // create all sprites
    for (const { $ } of this.world.query.with(Sprite)) {
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

## Managers and Queries

A mangers handles all the relationships between containers and containees. When you access `$` on an entity, it's proxied through the manager—every component is stored in the same place.

Queries return collections of entities based on a user's requirements. The results of queries are typed exactly like the ordinary entity's `$` property, so you'll have access to each of the components you've requested in your query—and nothing more.

They're pretty minimal and naïve, otherwise. Access the world's `.query` getter to get a new Query, and call `with()` or `without()` as needed to pare down the component selection. Adding the same component using both `with()` and `without()` will return nothing without warning.

`changed()` and `unchanged()` add additional restrictions, filtering out entities with components that have not been modified since the last `changed()` query and filtering out ones that have, respectively.

---

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: Honestly, pretty bad. It's a work in progress.

| 50K entities w/ 2 components | ecsy | ape-ecs | tecs  |
| :--------------------------- | :--: | :-----: | :---: |
| Create                       | 80ms |  300ms  | 500ms |
| Modify                       | 6ms  |   7ms   | 275ms |

**Q/S**: After reading the code, I realize this manages to be even less type-safe than I would have thought possible.  
**A**: Also yes. But again, this is all about ergonomics and my feelings.
