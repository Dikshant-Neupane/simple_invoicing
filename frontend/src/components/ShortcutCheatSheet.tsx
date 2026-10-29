import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { ACTION_KEYS, ACTION_LABELS, type ActionKey } from '../utils/shortcutDefaults';
import ModalCloseButton from './ModalCloseButton';

type ShortcutCheatSheetProps = {
  onClose: () => void;
  /**
   * The user's current shortcut map, customised keys included. The host
   * reads it from context; tests pass a map directly so this modal stays
   * free of app context and renders under server side rendering.
   */
  shortcutsMap: Record<ActionKey, string>;
};

export default function ShortcutCheatSheet({ onClose, shortcutsMap }: ShortcutCheatSheetProps) {
  useEscapeClose(onClose);

  // Focus returns to where it was when the sheet closes, so a keyboard
  // user does not lose their place in the page they came from.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-cheat-sheet-title"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel__header">
          <div>
            <p className="eyebrow">Keyboard Shortcuts</p>
            <h2 className="nav-panel__title" id="shortcut-cheat-sheet-title">Keyboard shortcut cheat sheet</h2>
          </div>
          <ModalCloseButton onClick={onClose} label="Close keyboard shortcut cheat sheet" />
        </div>

        <p className="section-copy">
          Press <kbd>?</kbd> anywhere to open this list. Press Escape or click outside to close it.
        </p>

        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {ACTION_KEYS.map((key) => (
              <tr key={key}>
                <td>{ACTION_LABELS[key]}</td>
                <td>
                  <kbd>{shortcutsMap[key]}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="section-copy" style={{ marginTop: '16px' }}>
          <Link to="/settings/shortcuts" onClick={onClose}>Customise shortcuts</Link>
        </p>
      </div>
    </div>
  );
}
