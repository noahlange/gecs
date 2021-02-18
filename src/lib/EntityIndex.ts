export class EntityIndex {
  protected indices: Record<string, string[]> = {};
  protected pending: Record<string, string[]> = {};

  public index(entity: string, ids: string[]): void {
    for (const id of ids) {
      (this.indices[id] ??= []).push(entity);
    }
  }

  public unindex(entity: string, ids: string[]): void {
    for (const id of ids) {
      const index = this.indices[id];
      index.splice(index.indexOf(entity), 1);
    }
  }

  public get(id: string): string[] {
    return this.indices[id] ?? [];
  }

  public all(ids: string[]): string[][] {
    return ids.map(id => this.indices[id] ?? []);
  }
}
