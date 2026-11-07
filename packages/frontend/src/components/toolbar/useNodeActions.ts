import type { TFunction } from 'i18next';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useHass } from '@/contexts/HassContext';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useFlowStore } from '@/store/flow-store';
import { isMacOS } from '@/utils/useAgentPlatform';
import type { NodeAction, NodeActionContext } from '../actions';
import {
  getAlignBottomAction,
  getAlignLeftAction,
  getAlignRightAction,
  getAlignTopAction,
  getCopyAction,
  getCutAction,
  getDeleteAction,
  getDisconnectAction,
  getDuplicateAction,
  getPasteAction,
  getRedoAction,
  getRunAction,
  getSelectAllAction,
  getToggleEnabledAction,
  getUndoAction,
} from '../actions';

/**
 * Every action the canvas offers, in the order the keyboard resolver should try
 * them. New actions belong here.
 */
export function getNodeActions(t: TFunction): NodeAction[] {
  return [
    getUndoAction(t),
    getRedoAction(t),
    getRunAction(t),
    getDuplicateAction(t),
    getCopyAction(t),
    getCutAction(t),
    getPasteAction(t),
    getAlignLeftAction(t),
    getAlignRightAction(t),
    getAlignTopAction(t),
    getAlignBottomAction(t),
    getDisconnectAction(t),
    getSelectAllAction(t),
    getToggleEnabledAction(t),
    getDeleteAction(t),
  ];
}

/** Display order of the toolbar groups, so the bar reads left to right by intent. */
export const NODE_ACTION_GROUP_ORDER = [
  'history',
  'node-specific',
  'selection',
  'clipboard',
  'edit',
  'align',
  'delete',
] as const satisfies readonly NonNullable<NodeAction['group']>[];

export function groupNodeActions(actions: readonly NodeAction[]): NodeAction[] {
  const rank = new Map<string, number>(NODE_ACTION_GROUP_ORDER.map((name, i) => [name, i]));

  return [...actions].sort(
    (a, b) =>
      (rank.get(a.group ?? 'node-specific') ?? 0) - (rank.get(b.group ?? 'node-specific') ?? 0)
  );
}

/** Format a shortcut string such as `ctrl+shift+arrowup` for the current platform. */
export function formatShortcut(shortcut: string, t: TFunction): string {
  const isMac = isMacOS();

  return shortcut
    .split('+')
    .map((part) => {
      if (part === 'ctrl') return isMac ? t('shortcuts.cmd') : t('shortcuts.ctrl');
      if (part === 'shift') return t('shortcuts.shift');
      if (part === 'alt') return t('shortcuts.alt');
      if (part === 'arrowup') return t('shortcuts.arrowUp');
      if (part === 'arrowdown') return t('shortcuts.arrowDown');
      if (part === 'arrowleft') return t('shortcuts.arrowLeft');
      if (part === 'arrowright') return t('shortcuts.arrowRight');
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('+');
}

/** Everything an action needs to run: the live flow, the clipboard and the API. */
export function useNodeActionContext(): NodeActionContext {
  const { hass, config: hassConfig } = useHass();
  const {
    nodes,
    edges,
    clipboard,
    pasteCount,
    addNode,
    removeNode,
    updateNodeData,
    setNodes,
    setEdges,
    setClipboard,
    setPasteCount,
  } = useFlowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      clipboard: s.clipboard,
      pasteCount: s.pasteCount,
      addNode: s.addNode,
      removeNode: s.removeNode,
      updateNodeData: s.updateNodeData,
      setNodes: s.setNodes,
      setEdges: s.setEdges,
      setClipboard: s.setClipboard,
      setPasteCount: s.setPasteCount,
    }))
  );
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return useMemo(
    () => ({
      selectedNodes: nodes.filter((n) => n.selected),
      nodes,
      edges,
      clipboard,
      pasteCount,
      hass,
      hassConfig,
      addNode,
      removeNode,
      updateNodeData,
      setNodes,
      setEdges,
      setClipboard,
      setPasteCount,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      nodes,
      edges,
      clipboard,
      pasteCount,
      hass,
      hassConfig,
      addNode,
      removeNode,
      updateNodeData,
      setNodes,
      setEdges,
      setClipboard,
      setPasteCount,
      undo,
      redo,
      canUndo,
      canRedo,
    ]
  );
}

/** Actions plus their context, ready to render or to fire from a shortcut. */
export function useNodeActions(): { context: NodeActionContext; actions: NodeAction[] } {
  const { t } = useTranslation();
  const context = useNodeActionContext();
  const actions = useMemo(() => getNodeActions(t), [t]);

  return { context, actions };
}

/**
 * Global keydown resolver. Mount this exactly once, next to whichever bar is
 * visible — two mounts would run every shortcut twice.
 */
export function useNodeActionShortcuts(
  actions: readonly NodeAction[],
  context: NodeActionContext
): void {
  useEffect(() => {
    if (actions.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = isMacOS();
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      let shortcut = '';
      if (modifier) shortcut += 'ctrl+';
      if (event.shiftKey) shortcut += 'shift+';
      if (event.altKey) shortcut += 'alt+';
      shortcut += event.key.toLowerCase();

      const action = actions.find((a) => {
        if (!a.shortcut) return false;
        const shortcuts = Array.isArray(a.shortcut) ? a.shortcut : [a.shortcut];
        if (!shortcuts.includes(shortcut)) return false;
        return a.isEnabled ? a.isEnabled(context) : true;
      });

      if (action) {
        event.preventDefault();
        action.execute(context);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, context]);
}

/** Number of nodes currently sitting on the clipboard, for the paste badge. */
export function readClipboardNodeCount(clipboard: string | null): number {
  if (!clipboard) return 0;

  try {
    const parsed: unknown = JSON.parse(clipboard);
    if (typeof parsed !== 'object' || parsed === null) return 0;
    const nodes = (parsed as { nodes?: unknown }).nodes;
    return Array.isArray(nodes) ? nodes.length : 0;
  } catch {
    return 0;
  }
}
