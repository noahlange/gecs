# 1.0.0-alpha

## 1.0.0-alpha.7

- remove support for ref population by static id.

## 1.0.0-alpha.6

- fixes bug that discarded type info when `Entity.has()` was passed multiple arguments
- allow user to pass static ID to `ctx.create()`
- allows user to populate entity refs using a static ID
- implements `references()` queries

## 1.0.0-alpha.5

- reverts query API from `noun.adjective()` to `adjective.noun()`

## 1.0.0-alpha.4

- adds `debug.leak` decorator to help track entity leaks
- makes `EntityRef` components bidirectional
- support query-time ad-hoc tag registration
- various optimizations (30%+ benchmark gains)
  - reduces scale of prototype tampering
  - switch to default numeric keys (strings optional)
    - release ids from destroyed entities
- implements abstract `Pipeline` class for system composition
  - pares down on excessive system creation with `sequence()`
