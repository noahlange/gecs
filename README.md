# gecs

**gecs** ('g' as in 'gecko,' not as in 'GIF') is an experimental, generic-abusing [entity-component-system](https://en.wikipedia.org/wiki/Entity_component_system) framework thing written in [TypeScript](https://www.typescriptlang.org).

## Installation

```
npm i gecs
```

## Running the benchmarks

First, with a fresh install and having already run `build`, run <kbd>npm run bench:master</kbd> to generate baseline results. Once you've made some changes, run <kbd>npm run bench</kbd> to generate a "working" benchmark file and compare to the baseline.

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

export class Sprite extends Component {
  // alternative to "readonly"
  public static type = 'sprite' as const;
  // instance properties...
  public anchor: number = 0.5;
  public path: string = '/assets/mole.png';
}
```

By passing a series of component classes to the entity's static `with()` method, you can declaratively define the structure of your entity. The static `type` property of each component class serves as the key by which the component can be accessed from its containing entity.

```ts
import { Component, Entity } from 'gecs';

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

These component instances are accessed via the `$` property.

```ts
import { Entity } from 'gecs';
import { Foo, Bar } from './components';

const MyEntity = Entity.with(Foo, Bar);

const e = new MyEntity();

e.$.foobly instanceof Foo; // true
e.$.foobly.value === '1'; // true

e.$.woobly instanceof Bar; // true
e.$.woobly.value === 1; // true
```

Per the example above, you can `extend` the result of the `with()` call to create a custom entity class, or create new instances using the return value of `with()` value as-is.

```typescript
// composition
const MyEntity1 = Entity.with(Position, Sprite);

// inheritance
class MyEntity2 extends Entity.with(Position, Sprite) {}
```

This is a trade-off; while the first ("composition") is terser and discourages the addition of custom functionality to your entities, typing its instances is slightly more obnoxious.

The second ("inheritance") gives you more flexibility, as well as a lengthy rope to hang yourself with.

```typescript
// composition
type InstanceMyEntity1 = InstanceType<typeof MyEntity>;
// inheritance
type InstanceMyEntity2 = MyEntity2;
```

You may need to hint an entity's type without a concrete instance on hand (e.g. in the case of function parameters).

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
    // using an `instanceof` type guard, we can use class-specific functionality
  }

  if (entity.has(Foo)) {
    // the `has()` type guard ensures the presence of the component Foo
  }

  if (entity.is('BAR')) {
    // and `is()` ensures the presence of the tag "BAR"
  }
}
```

And if you need to type-cast a generic entity type to an instance of a specific class with a compatible component set, you can use `instanceof` to [narrow the type](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#instanceof-narrowing) accordingly.

## Systems

At its core, a system is a function or object that performs one or more closely-related tasks.

```ts
import type { Context } from 'gecs';
import { Position, Velocity } from './components';

export function movement(ctx: Context): void {
  for (const { $ } of ctx.$.components(Position, Velocity)) {
    $.position.x += $.velocity.dx;
    $.position.y += $.velocity.dy;
  }
}
```

**gecs** supports both stateful object-oriented systems and stateless functional systems. If you need to take advantage of object persistence or invoke system lifecycle methods, then a stateful system is your best option.

```ts
import { System } from 'gecs';
import { InputManager } from 'my-magical-library';

import { Position, Clickable } from './components';

export class ClickPositionSystem extends System {
  public input = new InputManager();

  public tick() {
    if (this.input.isMouseDown()) {
      const { x, y } = this.input.getMousePosition();
      for (const { $ } of this.ctx.$.components(Position, Clickable)) {
        if ($.position.x === x && $.position.y === y) {
          alert('Clicked!');
        }
      }
    }
  }
}
```

If not, stateless systems can help simplify your codebase.

The primary functionality of a System is executed within its `start()`, `stop()` and/or `tick()` methods. While both methods are technically optional, every system will have at least one. Some run once or twice—map generation, for example—while others might run on every tick and have no initialization code to speak of.

An example implementation of a simple PIXI.js renderer:

```typescript
import * as PIXI from 'pixi.js';
import { System } from 'gecs';

import { Sprite, Position, Player } from './components';

class Renderer extends System {
  protected sprites: Record<string, { path: string; sprite: PIXI.Sprite }> = {};

  protected $ = {
    sprites: this.ctx.$.components(Sprite).some.components(Position)
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

  // both start() and tick() functions can be async
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

### System composition

**gecs** offers three system composition functions that allow you to structure your game's system flow without forcing you to wrap systems in complex branching logic.

The `sequence()` and `parallel()` functions accept an array of systems or system functions and return another system "wrapping" the ones passed in.

- Systems passed to the `sequence()` helper are run consecutively. If your tick method/system function returns a `Promise`, it will be resolved before starting the next system. The systems passed to `System.with()` are implicitly run in sequence.

- Systems passed to the `parallel()` helper run simultaneously. If these systems execute synchronously, the helper has no effect. If not, the system will wait until all returned promises have been resolved before moving on.

```ts
import { parallel, sequence, conditional } from 'gecs';
import { SimA, SimB, SimC } from './sims';
import { setup, teardown } from './misc';

// execute all systems simultaneously, moving on once all have returned/resolved
const inParallel = parallel(SimA, SimB, SimC);

// execute all systems in order, waiting for each system to resolve in turn
const inSequence = sequence(setup, inParallel, teardown);

// only execute if the game state's mode property is "SIMULATION"
const ifSimulating = conditional(
  ctx => ctx.state.mode === GameMode.SIMULATION,
  inSequence
);
```

### Caveats

**gecs** is not thread-safe and offers no guarantees of anything beyond "these will run one at a time in this order" and "nothing else will happen until these are done." The specifics of handling locks, mutexes, shared memory arrays and how to wrangle WebWorkers are likewise beyond the purview of this README.

## Contexts

The relationship between the `Context` and its `Systems` mirrors that of an `Entity` and its `Components`. Like an entity is created `with()` components, a context is created `with()` systems.

You can optionally define the type of a Context's a `state`.

```typescript
import { Context, Entity } from 'gecs';

import { A, B, C, D } from './systems';

interface MyContextState {
  foo: number;
}

// run A, B, C and D in order
const MyContext1 = Context.with<MyContextState>(A, B, C, D);

// run A, followed by B+C in parallel and then followed by D.
const MyContext2 = Context.with(A, parallel(B, C), D);
```

The precise mechanism by which an async system runs asynchronously (e.g., web worker, child process, etc.), is up to the developer.

When the context's (async) `start()` method is invoked, each of the context's systems is booted in the order it was passed to `with()`. Each time `tick()` is called, the context invokes the `tick()` method of each of its systems (again, in order).

## Queries

Queries return collections of entities based on the user's criteria. Query results are typed exactly like an ordinary entity, so you'll have (typed) access to each of the components you've requested in your query—but nothing more.

```ts
const q = ctx.$.components
  .all(A, B, C)
  .components.some(D, E, F)
  .tags.any('1', '2', '3');
```

### Building

Queries consist of one or more "steps," each corresponding to a different type of query— components, tags or entities.

```typescript
const q1 = ctx.$.components(A, B);
const q2 = ctx.$.tags('one', 'two', 'three');
```

Steps are executed sequentially. The result of a query is the intersection of each step's results.

```typescript
ctx.$.components
  .some(A, B) // (A | B)
  .tags.all('one', 'two'); //  & ('one' & 'two')
```

Query steps can be modified with `.all`, `.any` and `.none` to perform basic boolean operations. `.none` has no effect on the query's type signature, but does have an effect on its results. `.some` expands the query result's type signature with additional optional (i.e., possibly undefined) components, but has no effect on the query's results.

```typescript
// the "all" is implicit if a modifier is omitted
ctx.$.components(A, B); // A & B
ctx.$.components.all(A, B); // A & B

ctx.$.components.any(A, B); // (A | B) | (A & B)
ctx.$.components.some(A, B); // A? | B?
ctx.$.components.none(A, B); // !(A | B)
```

Naturally, these can be chained:

```typescript
ctx.$
  .components.all(A, B) // (A & B)
  .components.some(C);  // & C?
  .components.none(D);  // & !D
```

### Execution

You can invoke a query's `first()` or `get()` methods to access its result set. The query instance also has a `[Symbol.iterator]` method, so you can iterate directly over the result set with `for-of` or collect it with `Array.from()`.

```typescript
const query = ctx.$.components(A, B);

// instance methods
const first = query.first(); // (A & B) | null
const all = query.get(); // (A & B)[]

// will work with sets, etc.
const set = new Set(query); // Set<A & B>

// also as a generic iterable
for (const result of query) {
  // A & B
}
```

### Persistence

Once a query is executed for the first time, any subsequent query with the same "signature" will return the cached result set. The overhead associated with creating a new query each `tick()` is _relatively_ minor, but by assigning the query to a variable/class property, you can access and execute the constructed query without being forced to rebuild it.

```typescript
class MySystem extends System {
  public $ = {
    abc: this.ctx.$.components(A, B, C)
  };

  public tick() {
    for (const abc of this.$.abc) {
      // ...
    }
  }
}
```

You can also persist queries with stateless systems using the `QueryType` export.

```typescript
// Currently undefined; we'll define it shortly.
let $: {
  abc: QueryType<[typeof A, typeof B, typeof C]>;
};

function MySystem(ctx: Context) {
  // create it if it doesn't exist
  $ ??= { abc: ctx.components(A, B, C) };
  // and use normally
  for (const abc of $.abc) {
    // ...
  }
}
```

## Saving & Loading

Being able to export the game state to a serializable format and reloading it later is important. And since that is the case, it's also intended to be pretty straightforward. _By default_, the output is a bulky POJO—~2000 entities runs me about 650 KB. There are a few strategies you can use to reduce the size of this output:

### Entity filtering

Filter entities by passing `ctx.save()` an `entityFilter` option—a predicate passed the entity instance and expecting a boolean-ish return value. This allows you to immediately weed out irrelevant entities before moving forward, which will significantly reduce the size of your result set (and save time).

### Custom serialization

You can write custom `toJSON()` methods to return only a subset of each component's data.

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

#### Compression

Compressing the original 650KB payload output with [Brotli](https://www.npmjs.com/package/brotli) brings it down to less than 20 KB (about 3% of the original size).

If you're working in the browser and can't load WebAssembly for one reason or another, [pako](https://github.com/nodeca/pako) is a great, marginally less effective (about 4% of the original size) alternative.

#### Custom serialization

If you're using `JSON.stringify` to serialize your state, you can customize a component's output by adding a `toJSON()` method. You can pair this with a setter to populate or manipulate a component's "exotic" properties on instantiation.

```ts
interface HealthState {
  value: number;
  max: number;
}

class Health extends Component {
  public health = new MyHealth(100);

  // return "$" on save...
  public toJSON(): HealthState {
    return {
      $: {
        value: this.health.value,
        max: this.health.max
      }
    };
  }

  // ...set via "$" on load
  public set $(value: HealthState) {
    this.health.doSomethingSpecial($.value, $.max);
  }
}
```

### Load

Serialization has one caveat: you must manually register all components types and entity constructors using `extends` before invoking `ctx.load()`. Composed entity classes don't need to be registered.

```typescript
import { Context } from 'gecs';
import { Components, Entities } from './lib';

// instantiate new context
const ctx = new Context();

// you must register components and entity constructors using inheritance
// (composed entity constructors don't need to be registered)
ctx.register({ ...Components, ...Entities });

// fetch and load state
await fetch('./save.json')
  .then(res => res.json())
  .then(ecs => ctx.load(ecs));

// and restart
await ctx.start();
```

---

## Questions/Statements & Answers/Responses

**Q/S**: How's the performance?  
**A/R**: Deceptively bad.

**Q/S**: Wait, what?  
**A/R**: Performs like garbage in micro-benchmarks (bottom 1-3 in [js-ecs-benchmarks](https://github.com/ddmills/js-ecs-benchmarks), depending on the task), but is as fast as or faster than ECSY in the [intersecting circles demo](https://ecsy.io/examples/#Intersecting%20circles).

That being said, _particularly_ awesome performance has never been a primary design goal—so long as it remains capable of 60 FPS+, features are (currently) a higher priority than performance improvements.

**Q/S**: Real-world example?  
**A/R**: Using a naïve culling implementation and PIXI for rendering, a 256×256 map from [FLARE](https://github.com/flareteam/flare-game) runs at about 2ms/frame with ~50MB memory usage.

**Q/S**: After reading the code, I am shocked, _shocked_ to find that this is less type-safe than I would have ever thought possible.  
**A/R**: This is correct. Unfortunately, this library and its design are more about ergonomics and my feelings than bulletproof type-safety.
