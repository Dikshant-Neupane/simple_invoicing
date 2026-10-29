import { useEffect, useState } from 'react';
import { useShortcuts } from '../context/ShortcutsContext';
import { shouldOpenCheatSheet } from '../utils/shortcutCheatSheet';
import ShortcutCheatSheet from './ShortcutCheatSheet';

/**
 * Listens for "?" app wide and shows the cheat sheet. Mounted once in
 * AppRoutes, inside the shortcuts provider, so the modal always sees the
 * user's current shortcut map.
 */
export function ShortcutCheatSheetHost() {
  const { shortcutsMap } = useShortcuts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (shouldOpenCheatSheet(e)) {
        setOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;
  return <ShortcutCheatSheet onClose={() => setOpen(false)} shortcutsMap={shortcutsMap} />;
}
