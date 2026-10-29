import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import ShortcutCheatSheet from './ShortcutCheatSheet';
import { ACTION_KEYS, ACTION_LABELS, DEFAULT_SHORTCUTS, type ActionKey } from '../utils/shortcutDefaults';
import { isEditableTarget, shouldOpenCheatSheet } from '../utils/shortcutCheatSheet';

const noop = () => {};

function fakeEvent(overrides: Record<string, unknown> = {}) {
  return {
    key: '?',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: null,
    ...overrides,
  } as unknown as Parameters<typeof shouldOpenCheatSheet>[0];
}

function fakeTarget(tagName: string, isContentEditable = false) {
  return { tagName, isContentEditable } as unknown as EventTarget;
}

describe('shouldOpenCheatSheet', () => {
  test('opens on a bare question mark', () => {
    expect(shouldOpenCheatSheet(fakeEvent())).toBe(true);
  });

  test('ignores other keys', () => {
    expect(shouldOpenCheatSheet(fakeEvent({ key: '/' }))).toBe(false);
    expect(shouldOpenCheatSheet(fakeEvent({ key: 'Escape' }))).toBe(false);
  });

  test('ignores the key with Ctrl, Alt or Meta held', () => {
    expect(shouldOpenCheatSheet(fakeEvent({ ctrlKey: true }))).toBe(false);
    expect(shouldOpenCheatSheet(fakeEvent({ altKey: true }))).toBe(false);
    expect(shouldOpenCheatSheet(fakeEvent({ metaKey: true }))).toBe(false);
  });

  test('does nothing while typing in a field', () => {
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(shouldOpenCheatSheet(fakeEvent({ target: fakeTarget(tag) }))).toBe(false);
    }
    expect(shouldOpenCheatSheet(fakeEvent({ target: fakeTarget('DIV', true) }))).toBe(false);
  });

  test('opens from a non editable element', () => {
    expect(shouldOpenCheatSheet(fakeEvent({ target: fakeTarget('DIV') }))).toBe(true);
    expect(shouldOpenCheatSheet(fakeEvent({ target: fakeTarget('BUTTON') }))).toBe(true);
  });
});

describe('isEditableTarget', () => {
  test('treats a missing target as not editable', () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('ShortcutCheatSheet', () => {
  test('renders a labelled dialog listing every action with its current key', () => {
    const customMap: Record<ActionKey, string> = {
      ...DEFAULT_SHORTCUTS,
      create_invoice: 'Ctrl+Alt+N',
      go_dashboard: 'Alt+9',
    };
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShortcutCheatSheet onClose={noop} shortcutsMap={customMap} />
      </MemoryRouter>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="shortcut-cheat-sheet-title"');
    expect(html).toContain('Keyboard shortcut cheat sheet');
    for (const key of ACTION_KEYS) {
      // Server rendering escapes "&" in the label.
      expect(html).toContain(ACTION_LABELS[key].replace('&', '&amp;'));
      expect(html).toContain(`<kbd>${customMap[key]}</kbd>`);
    }
    // A customised key shows, not the default it replaced.
    expect(html).not.toContain('<kbd>Ctrl+N</kbd>');
    expect(html).not.toContain('<kbd>Alt+O</kbd>');
  });

  test('links to the Keyboard Shortcuts page for customising', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ShortcutCheatSheet onClose={noop} shortcutsMap={DEFAULT_SHORTCUTS} />
      </MemoryRouter>,
    );

    expect(html).toContain('href="/settings/shortcuts"');
    expect(html).toContain('Customise shortcuts');
  });
});
