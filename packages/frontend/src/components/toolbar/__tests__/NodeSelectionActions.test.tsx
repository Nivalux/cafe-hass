import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(selector: T) => selector,
}));

vi.mock('@/contexts/HassContext', () => ({
  useHass: () => ({ hass: undefined, config: { url: '', token: '' } }),
}));

vi.mock('@/hooks/useUndoRedo', () => ({
  useUndoRedo: () => ({ undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false }),
}));

vi.mock('@/store/flow-store', () => ({
  useFlowStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      nodes: [{ id: 'a', selected: true }],
      edges: [],
      clipboard: null,
      pasteCount: 0,
      addNode: vi.fn(),
      removeNode: vi.fn(),
      updateNodeData: vi.fn(),
      setNodes: vi.fn(),
      setEdges: vi.fn(),
      setClipboard: vi.fn(),
      setPasteCount: vi.fn(),
    }),
}));

vi.mock('../../actions', () => {
  const action = (name: string) => () => ({
    name,
    group: 'history',
    icon: () => <span />,
    tooltip: name,
    execute: vi.fn(),
  });

  return {
    getAlignBottomAction: action('align-bottom'),
    getAlignLeftAction: action('align-left'),
    getAlignRightAction: action('align-right'),
    getAlignTopAction: action('align-top'),
    getCopyAction: action('copy'),
    getCutAction: action('cut'),
    getDeleteAction: action('delete'),
    getDisconnectAction: action('disconnect'),
    getDuplicateAction: action('duplicate'),
    getPasteAction: action('paste'),
    getRedoAction: action('redo'),
    getRunAction: action('run'),
    getSelectAllAction: action('selectAll'),
    getToggleEnabledAction: action('toggle-enabled'),
    getUndoAction: action('undo'),
  };
});

import { NodeSelectionActions } from '../NodeSelectionActions';

describe('NodeSelectionActions', () => {
  it('keeps the frequent actions on the header and hides the rest', () => {
    const html = renderToStaticMarkup(<NodeSelectionActions />);

    expect(html).toContain('title="delete"');
    expect(html).toContain('title="duplicate"');
    expect(html).toContain('title="copy"');
    expect(html).toContain('title="toggle-enabled"');
    expect(html).toContain('buttons.moreActions');
    expect(html).not.toContain('title="paste"');
  });
});
