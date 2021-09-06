# 1.0.0-alpha

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
