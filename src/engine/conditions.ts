import type { Condition, NightChoice, NightOption } from "./types.js";

/** 判斷結構化條件是否成立（純函式，不用 eval）。省略條件視為恆真。 */
export function evalCondition(
  cond: Condition | undefined,
  flags: ReadonlySet<string>,
  vars: Record<string, number>,
): boolean {
  if (!cond) return true;
  if (cond.allFlags && !cond.allFlags.every((f) => flags.has(f))) return false;
  if (cond.anyFlags && !cond.anyFlags.some((f) => flags.has(f))) return false;
  if (cond.notFlags && cond.notFlags.some((f) => flags.has(f))) return false;
  if (cond.minVars) {
    for (const k in cond.minVars) if ((vars[k] ?? 0) < cond.minVars[k]) return false;
  }
  if (cond.maxVars) {
    for (const k in cond.maxVars) if ((vars[k] ?? 0) > cond.maxVars[k]) return false;
  }
  return true;
}

/**
 * 一個抉擇關卡「目前可見」的選項（過濾掉 requires 不滿足的）。
 * reduce 與 selectors 都用這個，確保 optionIndex 對應一致。
 */
export function visibleOptions(
  choice: NightChoice,
  collected: readonly string[],
  vars: Record<string, number>,
): NightOption[] {
  const flags = new Set(collected);
  return choice.options.filter((o) => evalCondition(o.requires, flags, vars));
}
