/* eslint-disable max-classes-per-file */
import { System } from '../../ecs';

export class SystemA extends System {
  public static readonly type = 'a';
  public start(): void {
    console.log(SystemA.type);
  }
}

export class SystemB extends System {
  public static readonly type = 'b';

  public booted: boolean = false;
  public start(): void {
    console.log(SystemB.type);
    this.booted = true;
  }
}

export class SystemC extends System {
  public static readonly type = 'c';

  public booted: boolean = false;
  public async start(): Promise<void> {
    console.log(SystemC.type);
    this.booted = true;
  }
}
