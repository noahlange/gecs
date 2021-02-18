export interface ComponentClass {
  readonly type: string;
  new (): Component;
}

export class Component {
  public static readonly type: string;
}
