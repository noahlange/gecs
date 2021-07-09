export function union(...values: (bigint | null)[]): bigint {
  let res: bigint = 0n;
  for (const val of values) {
    res |= val ?? 0n;
  }
  return res;
}

export const match = {
  any(target: bigint, toMatch: bigint): boolean {
    return !target || (target & toMatch) > 0n;
  },
  all(target: bigint, toMatch: bigint): boolean {
    return (target & toMatch) === target;
  },
  none(target: bigint, toMatch: bigint): boolean {
    return !toMatch || !(toMatch & target);
  }
};
