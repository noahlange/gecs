# gecs

![CodeQL](https://github.com/noahlange/gecs/actions/workflows/codeql-analysis.yml/badge.svg)
[![Code Coverage](https://coveralls.io/repos/github/noahlange/gecs/badge.svg?branch=master)](https://coveralls.io/github/noahlange/gecs?branch=master)

**gecs** ('g' as in 'gecko,' not 'GIF') is an experimental, generic-abusing [entity-component-system](https://en.wikipedia.org/wiki/Entity_component_system) framework thing written in [TypeScript](https://www.typescriptlang.org).

Examples are available in the [gecs-example](https://github.com/noahlange/gecs-example) repository.

## Installation

```
npm i gecs
```

## Context & Plugins

The top-level organizational unit is the Plugin. The game's Context consists of one or more Plugins, each of which provides specific functionality. Each Plugin exports a (static, readonly) `type` property which, like with entities/components, is used as the access key on the context's `game` property.

```typescript
import { Context } from 'gecs';
import StatePlugin from './plugins/state';

const MyContext = Context.with(StatePlugin);

const myContext = new MyContext();

myContext.$.state instanceof StatePlugin; // true
```

The systems, entities, components and tags provided by a plugin are automatically registered when the Context's `start` method is invoked.

```typescript
import { Plugin, type PluginData } from 'gecs';
import { Position, Velocity, Collision } from './components';
import { Collider } from './entities';
import { myPhysicsSystem, MyOtherSystem } from './systems'

// you can decompose plugins across multiple packages with declaration merging
declare global {
  namespace $ {
    interface Plugins {
      [PhysicsSystem.type]: PhysicsSystem;
    }
  }
}

export default class PhysicsSystem extends Plugin<$.Plugins> {
  public static readonly type = 'physics';

  // entities, components, tags and systems to register on start
  public $: PluginData<$.Plugins> = {
    components: { Position, Velocity, Collision },
    entities: { Collider },
    // arbitrary string tags
    tags: ['one', 'two', 'three'],
    // systems; either stateless function systems or stateful, class-based
    systems: [myPhysicsSystem, MyOtherSystem]
  };

  // you can use the plugin to "host" commonly-used queries
  public readonly queries = {
    movers: this.ctx.query.components(Position, Velocity)
  }
}
```
 
## Entities & Components

An Entity is a loose wrapper around an arbitrary collection of Components.

Each component extends the `Component` class and must define a static `type` property. This property must resolve to [a literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types) or TypeScript will be basically useless for any entity/query using this component.

```typescript
export class Position extends Component {
  public static readonly type = 'position';
  // instance properties...
  public x: number = 0;
  public y: number = 0;
  public r: number = 0;
}
```

By passing a series of component classes to the entity's static `with()` method, you can declaratively define the structure of your entity. The static `type` property of each component class serves as the key by which the component can be accessed from its containing entity.

```ts
import { Component, Entity } from 'gecs';

// this component is accessed via `entity.$.foobly`
export class Foo extends Component {
  public static readonly type = 'foobly';
  public value: string = '1';
}

// this component is accessed via `entity.$.woobly`
export class Bar extends Component {
  public static readonly type = 'woobly';
  public value: number = 1;
}


const MyEntity = Entity.with(Foo, Bar);
const entity = ctx.create(MyEntity, { foobly: { value: '123' } });

entity.$.foobly instanceof Foo;  // true
entity.$.foobly.value === '123'; // true

entity.$.woobly instanceof Bar;  // true
entity.$.woobly.value === 1;     // true

```

`EntityRefs` are a special type of component that allow you to link one entity to another.

```ts
import { Entity, EntityRef } from 'gecs';
import { Actor, Item } from './entities';

export class Ownership extends EntityRef<Actor, Item> {
  public static readonly type = 'owner';
}

const owner = ctx.create(Actor);
const item = ctx.create(Item);

item.$.owner === null;          // true; refs default to null
item.$.owner = owner;           // refs are assigned like properties
item.$.owner instanceof Actor;  // true

// you can pass an entity as the value of the corresponding key in `ctx.create()`
const item2 = ctx.create(Item, { owner });
```

Per the example above, you can `extend` the result of the `with()` call to create a custom entity class, or create new instances using the return value of `with()` value as-is.

```typescript
// composition
const MyEntity1 = Entity.with(Position, Sprite);
type InstanceMyEntity1 = InstanceType<typeof MyEntity>;

// inheritance
class MyEntity2 extends Entity.with(Position, Sprite) {}
type InstanceMyEntity2 = MyEntity2;
```

This is a trade-off; while the first ("composition") is terser and discourages the addition of custom functionality to your entities, typing its instances is slightly more obnoxious.

You may need to hint an entity's type without a concrete instance on hand (e.g. in the case of function parameters)—you can use `EntityType` to do this.

```typescript
import { SpritePosition } from '../entities';

export type SpritePositionEntity = EntityType<
  [typeof Position, typeof Sprite], // required
  [typeof Foo] // optional
>;

function usingSpritePosition(entity: SpritePositionEntity): void {
  // a generic Component instance
  entity.$.position.x += 1;
  entity.$.position.y += 1;

  if (entity instanceof SpritePosition) {
    entity.myInstanceMethod();
    // using an `instanceof` type guard, we can use class-specific functionality
  }

  if (entity.has(Foo)) {
    // the `has()` type guard ensures the presence of the component Foo
    // entity.components.has() does _not_ act as a type guard
  }

  if (entity.is('BAR')) {
    // `is()` ensures the presence of the tag "BAR"
  }
}
```

And if you need to type-cast a generic entity type to an instance of a specific class with a compatible component set, you can use `instanceof` to [narrow the type](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#instanceof-narrowing) accordingly.

### Modifying entities

An entity's components and tags can be added/removed using the `.components` and `.tags` properties.

```typescript
entity.components.add(ComponentA, aData);
entity.components.has(A, B, C);
entity.components.remove(D, E, F);
entity.components.all();
[...entity.components]; // equivalent to .all()

for (const component of entity.components) {
  // do stuff
}
```

A major footgun here is that the types of entities with removed components will not change during the current system's `tick()`. Unless you're paying close attention, you may find yourself accessing a non-existent component.

```typescript
for (const entity of ctx.query.components(A, B)) {
  entity.components.remove(B); // 💣
  entity.$.b.foo = '???';      // 💥
}
```

`entity.tags` has an API broadly similar to JS's vanilla `Set`s. The primary difference is that methods that would ordinarily accept only a single argument can take spread arguments.

```typescript
entity.tags.add('a', 'b');
entity.tags.has('c', 'd');
entity.tags.remove('e', 'f');
entity.tags.all();

for (const tag of entity.tags) {
  // do stuff
}
```

## Systems

At its core, a system is a function or object that performs one or more closely-related tasks.

**gecs** supports both stateful object-oriented systems and stateless functional systems.

The primary functionality of a System is executed within its `start()`, `stop()` and/or `tick()` methods. While both methods are technically optional, every system will have at least one. Some run once or twice—map generation, for example—while others might run on every tick and have no initialization code to speak of.

An example implementation of a simple, stateful PIXI.js renderer:

```typescript
import * as PIXI from 'pixi.js';
import { System } from 'gecs';

import { Sprite, Position, Player } from './components';

class Renderer extends System {
  protected sprites: Record<string, { path: string; sprite: PIXI.Sprite }> = {};

  protected $ = {
    sprites: this.ctx.query
      .all.components(Sprite)
      .some.components(Position)
  };

  public tick(delta: number, time?: number): void {
    for (const entity of this.$.sprites) {
      const item = this.sprites[$.sprite.id];
      if (item) {
        // update sprite and position
        if (item.path !== $.sprite.path) {
          item.sprite = PIXI.Sprite.from($.sprite.path);
        }
        if (entity.has(Position)) {
          item.sprite.position.set($.position.x, position.y);
        }
      }
    }
  }

  // start() and stop() functions can be async
  public async start(): Promise<void> {
    this.app = new PIXI.Application();
    // create all sprites and add to the stage
    for (const { $ } of this.$.sprites) {
      const sprite = PIXI.Sprite.from($.sprite.path);
      sprite.anchor = $.sprite.anchor;
      this.sprites[$.sprite.id] = sprite;
      this.app.stage.addChild(child);
    }
    // bind the Context's "tick" method to PIXI's ticker
    this.app.ticker.add(this.ctx.tick.bind(this.ctx));
    // mount stage to DOM
    document.body.appendChild(this.app.view);
  }
}
```
If you need to take advantage of object persistence or invoke system lifecycle methods, then a stateful system is your best option. If not, stateless systems can help simplify your codebase.

```ts
import type { Context } from 'gecs';
import { Position, Velocity } from './components';

export function movement(ctx: Context): void {
  for (const { $ } of ctx.$.physics.queries.movers) {
    $.position.x += $.velocity.dx;
    $.position.y += $.velocity.dy;
  }
}
```

### System composition

**gecs** offers a handful of system composition functions that allow you to structure your game's system flow without forcing you to wrap systems in complex branching logic.

The `sequence()` function accepts an array of systems and returns another system "wrapping" the ones passed in.

- Systems passed to the `sequence()` helper are run consecutively. The systems passed to `Context.with()` are implicitly run in sequence.

The `conditional()`, `phase()` and `throttle()` helpers accept a single parameter, followed by an array of systems/system functions.

- `conditional()` takes a function with the game context as its sole parameter, followed by an array of systems/system functions.

- `phase()` takes a single value in the exported `PHASE` enum, followed by systems. There are three primary phases (`LOAD`, `UPDATE`, `RENDER`>), each with their own `PRE` and `POST` modifiers. Systems with assigned phases are executed in ascending order. Systems without an assigned phase are executed at the end of `UPDATE`.

- `throttle()` takes a single number parameter, `x`, followed by systems. A throttled system executes once per `x` ms.

```ts
import { sequence, conditional, phase, throttle } from 'gecs';
import { SimA, SimB } from './sims';
import { setup, teardown } from './misc';

// execute all systems in order
const inSequence = sequence(setup, SimA, SimB, teardown);

// only execute if the game state's mode property is "SIMULATION"
const ifSimulating = conditional(ctx => ctx.state.mode === GameMode.SIMULATION, inSequence);

const atTheEnd = phase(Phase.POST_RENDER, () => console.log('it is the very end of the tick'));

const throttled = throttle(200, () => console.log('will execute once every 200ms'));
```

## Queries

Queries return collections of entities based on the user's criteria. Query results are typed exactly like ordinary entities, so you'll have (typed) access to each of the components you've requested in your query—but nothing more.

```ts
const q = ctx.query
  .all.components(A, B, C)
  .some.components(D, E, F)
  .any.tags('1', '2', '3');
```

### Building

Queries consist of one or more "steps," each corresponding to a different type of query— components, tags or refs.

```typescript
const q1 = ctx.query.components(A, B);
const q2 = ctx.query.tags('one', 'two', 'three');

// `.references()` returns all entities with an EntityRef pointing to the passed entity instance
const q3 = ctx.query
  .components(RefComponent)
  .references(referencedEntity);
```

Steps are executed sequentially. The result of a query is the intersection of each step's results.

```typescript
ctx.query
  .some.components(A, B) // (A | B)
  .all.tags('one', 'two'); //  & ('one' & 'two')
```

Query steps can be modified with `.all`, `.any` and `.none` to perform basic boolean operations. `.none` has no effect on the query's type signature, but does have an effect on its results. `.some` expands the query result's type signature with additional optional (i.e., possibly undefined) components, but has no effect on the query's results.

```typescript
// the "all" is implicit if a modifier is omitted
ctx.query.components(A, B); // A & B
ctx.query.all.components(A, B); // A & B

ctx.query.any.components(A, B); // (A | B) | (A & B)
ctx.query.some.components(A, B); // A? | B?
ctx.query.none.components(A, B); // !(A | B)
```

Naturally, these can be chained:

```typescript
ctx.query
  .all.components(A, B) // (A & B)
  .some.components(C);  // & C?
  .none.components(D);  // & !D
```

### Execution

You can invoke a query's `first()` or `get()` methods to access its result set. Queries are lazily-executed: they won't attempt to fetch any results until an execution method is accessed query. Query instances have a `[Symbol.iterator]` method that invokes `get()` in turn; this allows you to execute and iterate over the result set in a single call, either using `for-of` or a generic iterable.

```typescript
// query has not yet been executed
const query = ctx.query.components(A, B);

// instance methods - query executed
const all = query.get(); // (A & B)[]
const first = query.first(); // (A & B) | null

// will work with sets, etc.
const set = new Set(query); // Set<A & B>

// also as a generic iterable
for (const { $ } of query) {
  // A & B
}
```

### Persistence

Once a query is executed for the first time, any subsequent query with the same "signature" will return the cached result set.

This means that overhead associated with creating a new query each `tick()` is _relatively_ minor—but by assigning the query to a variable/class property, you can access and execute the constructed query without being forced to rebuild it.

## Saving & Loading

Being able to export the game state to a serializable format and reloading it later is important. And since that is the case, it's also intended to be pretty straightforward. The output is a bulky POJO—in a purely naïve dump, ~2000 entities runs me about 650 KB. There are a number of strategies you can use to reduce the size of this output: entity filtering, custom component serialization and output compression.

### Entity filtering

Filter entities by passing `ctx.save()` an `entityFilter` option—a predicate passed the entity instance and expecting a boolean-ish return value. This allows you to immediately weed out irrelevant entities before moving forward, which will significantly reduce the size of your result set (and save time).
 
### Save

```typescript
import { Context, Serializer } from 'gecs';
import { Tag } from './misc';

// create and start the context
const ctx = new Context();
await ctx.start();

// filter out unneeded entities and dump to POJO
const { state, entities, queries } = ctx.save({
  entityFilter: entity => entity.tags.has(Tag.TO_SERIALIZE)
});

console.log(state === ctx.state); // true
console.log(entities.some(e => e.tags.includes(Tag.TO_SERIALIZE))); // false
```

### Load

Serialization has one caveat: you must manually register all components types and entity constructors using `extends` before invoking `ctx.load()`. Composed entity classes don't need to be registered.

```typescript
import { Context } from 'gecs';
import { Components, Entities, Tags } from './lib';

// instantiate new context
const ctx = new Context();

// you must register components and entity constructors using inheritance
// (composed entity constructors don't need to be registered)
ctx.register(
  Object.values(Components),
  Object.values(Entities),
  Object.values(Tags)
);

// fetch and load state
await fetch('./save.json')
  .then(res => res.json())
  .then(ecs => ctx.load(ecs));

// and restart
await ctx.start();
```

---

## Running the benchmarks

First, with a fresh install and having already run `build`, run <kbd>npm run bench:master</kbd> to generate baseline results. Once you've made some changes, run <kbd>npm run bench</kbd> to generate a "working" benchmark file and compare to the baseline.

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: It's complicated.

**Q/S**: ???  
**A/R**: I would say it's comparable to other "rich" ECS implementations (e.g., Ecsy) and poor relative to some other lower-level ECS libraries (bitecs, wolfecs). It's not a performance-oriented implementation, but it's also not a naïve one. Particularly awesome performance has never been a primary design goal (so long as it remains capable of 60 FPS+, features are (currently) a higher priority than performance improvements) and I'm sure there's plenty of low-hanging fruit remaining for performance gains.

**Q/S**: Real-world example?  
**A/R**: Using a naïve culling implementation and PIXI for rendering, a 256×256 map from [FLARE](https://github.com/flareteam/flare-game) runs at 5ms/frame with ~40MB memory usage.

**Q/S**: After reading the code, I am shocked, _shocked_ to find that this is less type-safe than I would have ever thought possible.  
**A/R**: This is correct. Unfortunately, this library and its design are more about ergonomics and my feelings than bulletproof type-safety.
