/* eslint-disable max-classes-per-file */
import type { PluginData } from '../../types';

import { conditional, phase, Plugin, sequence, throttle } from '../../';
import { Phase } from '../../types';

export class ConditionalState extends Plugin {
  public static readonly type = 'state';
  public value = 0;

  public $ = {
    systems: [
      conditional(
        () => this.value === 0,
        () => (this.value += 25)
      ),
      conditional(
        () => this.value === 0,
        () => (this.value += 250)
      ),
      conditional(
        () => this.value > 0,
        () => (this.value += 100)
      )
    ]
  };
}

export class PhaseState extends Plugin {
  public static readonly type = 'state';
  public value = 0;
  public $ = {
    systems: [
      phase(
        Phase.ON_LOAD,
        () => (this.value += 1),
        () => (this.value += 1)
      ),
      phase(
        Phase.ON_UPDATE,
        sequence(
          () => (this.value *= 3),
          () => (this.value /= 2)
        )
      )
    ]
  };
}

export class SequenceState extends Plugin {
  public static readonly type = 'state';
  public value = 0;
  public $ = {
    systems: [
      phase(
        Phase.ON_UPDATE,
        sequence(
          () => (this.value += 3),
          () => (this.value **= 2)
        )
      )
    ]
  };
}

export class ThrottleState extends Plugin<{ state: ThrottleState }> {
  public static readonly type = 'state';
  public value = 0;
  public $: PluginData<{ state: ThrottleState }> = {
    systems: [() => (this.value += 1), throttle(125, () => (this.value *= 2))]
  };
}
