# Lumina FRP Core - TLA+ Formal Specification

This directory contains formal TLA+ specifications for verifying the correctness of Lumina's FRP reactive core (`packages/core/src/reactive.ts`).

## Quick Start

```bash
# Enter development environment
nix develop

# Run safety verification (full model)
tlc -config LuminaReactive.cfg -workers 4 LuminaReactive.tla

# Run liveness verification
tlc -config LuminaReactive_Liveness.cfg -workers 4 LuminaReactive.tla

# Quick verification (small model)
tlc -config LuminaReactive_Small.cfg LuminaReactive.tla
```

## Verified Properties

### Safety Invariants (104M+ states)

| Property | Description |
|----------|-------------|
| NoMemoryLeak | Inactive effects have no subscriptions |
| NoCycles | Memos cannot read signals they write to |
| ParentChildConsistency | Bidirectional parent-child relationships |
| ActiveEffectConsistency | Executing effect is always active |
| DisposedChildrenInactive | Disposed effects have no children |
| PendingEffectsActive | Pending effects are active |
| CleanupMonotonic | Cleanup counter never decreases |

### Liveness Properties (7M+ states)

| Property | Description |
|----------|-------------|
| EventuallyQuiescent | System reaches stable state |
| EventualConsistency | Pending effects eventually execute |

## Model Configuration

| Config | Signals | Effects | Use Case |
|--------|---------|---------|----------|
| `LuminaReactive.cfg` | 2 | 3 | Full verification |
| `LuminaReactive_Small.cfg` | 1 | 2 | Quick checks |
| `*_Liveness.cfg` | - | - | Temporal properties |

## Specification Structure

```
LuminaReactive.tla
├── VARIABLES
│   ├── sigValue, sigSubscribers      # Signal state
│   ├── effActive, effParent, ...     # Effect state
│   ├── currentEffect, batchDepth     # Execution state
│   └── memoSource, memoUpToDate      # Memo state
├── ACTIONS
│   ├── ReadSignal, WriteSignal       # Signal operations
│   ├── CreateEffect, BeginEffect     # Effect lifecycle
│   ├── BeginBatch, EndBatch          # Batching
│   └── CreateMemo, ReadMemo          # Derived signals
├── INVARIANTS
│   └── Safety properties
└── PROPERTIES
    └── Liveness properties (with Fairness)
```

## Key Semantics Modeled

1. **Dependency Tracking**: Effects automatically subscribe to signals they read
2. **Batch Updates**: Signal writes during batch queue effects, execute on batch end
3. **Hierarchical Disposal**: Parent re-execution disposes all descendants
4. **Cycle Prevention**: Memos cannot create circular dependencies
5. **Error Recovery**: System can recover from error states
