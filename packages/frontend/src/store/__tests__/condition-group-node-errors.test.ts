import type { Node } from '@xyflow/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type FlowNodeData, useFlowStore } from '../flow-store';

const trigger: Node<FlowNodeData> = {
  id: 'trig',
  type: 'trigger',
  position: { x: 0, y: 0 },
  data: { trigger: 'state', entity_id: 'light.a', to: 'on' },
};

function conditionNode(id: string, data: Record<string, unknown>): Node<FlowNodeData> {
  return { id, type: 'condition', position: { x: 200, y: 0 }, data };
}

/**
 * An empty AND/OR node transpiles to a group Home Assistant reads as "nothing to
 * check", so it blocks saving. A group with one condition is only redundant, so
 * it warns in amber and must stay saveable.
 */
describe('condition group severities in the store', () => {
  beforeEach(() => {
    useFlowStore.getState().reset();
  });

  it('blocks on an empty AND group', () => {
    const { addNode, validateAllNodes } = useFlowStore.getState();
    addNode(trigger);
    addNode(conditionNode('cond_empty', { condition: 'and', conditions: [] }));
    validateAllNodes();

    const state = useFlowStore.getState();
    expect(state.nodeErrors.get('cond_empty')?.[0]?.severity).toBe('error');
    expect(state.hasValidationErrors()).toBe(true);
  });

  it('warns but does not block on a single-condition OR group', () => {
    const { addNode, validateAllNodes } = useFlowStore.getState();
    addNode(trigger);
    addNode(
      conditionNode('cond_single', {
        condition: 'or',
        conditions: [{ condition: 'state', entity_id: 'light.b', state: 'on' }],
      })
    );
    validateAllNodes();

    const state = useFlowStore.getState();
    expect(state.nodeErrors.get('cond_single')?.map((e) => e.severity)).toEqual(['warning']);
    expect(state.hasValidationErrors()).toBe(false);
  });

  it('clears the warning once the group is filled in', () => {
    const { addNode, updateNodeData, validateAllNodes } = useFlowStore.getState();
    addNode(trigger);
    addNode(conditionNode('cond', { condition: 'and', conditions: [] }));
    validateAllNodes();
    expect(useFlowStore.getState().hasValidationErrors()).toBe(true);

    updateNodeData('cond', {
      condition: 'and',
      conditions: [
        { condition: 'state', entity_id: 'light.b', state: 'on' },
        { condition: 'state', entity_id: 'light.c', state: 'off' },
      ],
    });

    expect(useFlowStore.getState().nodeErrors.has('cond')).toBe(false);
    expect(useFlowStore.getState().hasValidationErrors()).toBe(false);
  });
});
