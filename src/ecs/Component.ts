export interface ComponentClass {
  readonly type: string;
  new (data?: Record<string, unknown>): Component;
}

export class Component {
  public static readonly type: string;
  public constructor(data?: Record<string, unknown>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
