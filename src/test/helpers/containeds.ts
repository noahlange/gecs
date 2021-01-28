/* eslint-disable max-classes-per-file */
import { Contained } from '../../lib';

export class A extends Contained {
  public static readonly type = 'a';
  public value: string = '1';
}

export class B extends Contained {
  public static readonly type = 'b';
  public value: number = 1;
}

export class C extends Contained {
  public static readonly type = 'c';
  public value: boolean = true;
}
