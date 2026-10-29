type CheatSheetKeyEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>;

/**
 * Whether the event target is a field the user is typing in. A bare "?"
 * pressed there is text being typed, not a request for the cheat sheet.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const element = target as HTMLElement;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

/**
 * Whether this keydown should open the cheat sheet: a bare "?" (Shift plus
 * slash on most layouts) pressed outside any editable field. Combos carrying
 * Ctrl, Alt or Meta are some other shortcut, not the cheat sheet key.
 */
export function shouldOpenCheatSheet(event: CheatSheetKeyEvent): boolean {
  if (event.key !== '?') return false;
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  return !isEditableTarget(event.target);
}
