import { describe, expect, it, vi } from 'vitest';
import type { NodeAction } from '../../actions';
import { groupNodeActions, readClipboardNodeCount } from '../useNodeActions';

function action(name: string, group: NodeAction['group']): NodeAction {
  return { name, group, icon: () => null, tooltip: name, execute: vi.fn() };
}

describe('groupNodeActions', () => {
  it('orders actions by their group, keeping the order inside a group', () => {
    const ordered = groupNodeActions([
      action('delete', 'delete'),
      action('copy', 'clipboard'),
      action('undo', 'history'),
      action('align-left', 'align'),
      action('redo', 'history'),
    ]);

    expect(ordered.map((a) => a.name)).toEqual(['undo', 'redo', 'copy', 'align-left', 'delete']);
  });

  it('does not mutate the input', () => {
    const actions = [action('delete', 'delete'), action('undo', 'history')];

    groupNodeActions(actions);

    expect(actions.map((a) => a.name)).toEqual(['delete', 'undo']);
  });
});

describe('readClipboardNodeCount', () => {
  it('counts the nodes on the clipboard', () => {
    expect(readClipboardNodeCount(JSON.stringify({ nodes: [{}, {}] }))).toBe(2);
  });

  it('returns zero for an empty or broken clipboard', () => {
    expect(readClipboardNodeCount(null)).toBe(0);
    expect(readClipboardNodeCount('not json')).toBe(0);
    expect(readClipboardNodeCount('[]')).toBe(0);
  });
});
