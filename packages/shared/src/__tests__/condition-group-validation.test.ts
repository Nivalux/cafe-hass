// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  hasBlockingValidationErrors,
  validateConditionTree,
  validateNodeData,
} from '../schemas/validation';

describe('validateConditionTree', () => {
  it('flags an empty AND group as an error', () => {
    const issues = validateConditionTree({ condition: 'and', conditions: [] });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.path).toEqual(['conditions']);
    expect(issues[0]?.message).toContain('AND');
  });

  it('flags an empty OR group as an error', () => {
    const issues = validateConditionTree({ condition: 'or', conditions: [] });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('OR');
  });

  it('treats a missing conditions list like an empty one', () => {
    const issues = validateConditionTree({ condition: 'or' });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
  });

  it('warns instead of failing when a group holds a single condition', () => {
    const issues = validateConditionTree({
      condition: 'or',
      conditions: [{ condition: 'state', entity_id: 'light.a', state: 'on' }],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
  });

  it('accepts a group with two conditions', () => {
    const issues = validateConditionTree({
      condition: 'and',
      conditions: [
        { condition: 'state', entity_id: 'light.a', state: 'on' },
        { condition: 'state', entity_id: 'light.b', state: 'off' },
      ],
    });

    expect(issues).toEqual([]);
  });

  it('accepts a NOT group with a single condition', () => {
    const issues = validateConditionTree({
      condition: 'not',
      conditions: [{ condition: 'state', entity_id: 'light.a', state: 'on' }],
    });

    expect(issues).toEqual([]);
  });

  it('flags an empty NOT group as an error', () => {
    const issues = validateConditionTree({ condition: 'not', conditions: [] });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
  });

  it('recurses into nested groups and points at the offending path', () => {
    const issues = validateConditionTree({
      condition: 'and',
      conditions: [
        { condition: 'state', entity_id: 'light.a', state: 'on' },
        { condition: 'or', conditions: [] },
      ],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toEqual(['conditions', '1', 'conditions']);
  });

  it('ignores leaf conditions', () => {
    expect(
      validateConditionTree({ condition: 'state', entity_id: 'light.a', state: 'on' })
    ).toEqual([]);
  });
});

describe('validateNodeData condition groups', () => {
  it('reports an empty group on a condition node', () => {
    const issues = validateNodeData('condition', { condition: 'and', conditions: [] });

    expect(issues.some((e) => e.severity === 'error' && e.message.includes('AND'))).toBe(true);
  });

  it('keeps schema failures and group findings together', () => {
    const issues = validateNodeData('condition', { condition: '', conditions: [] });

    expect(issues.some((e) => e.severity === 'error')).toBe(true);
    expect(hasBlockingValidationErrors(issues)).toBe(true);
  });

  it('does not let a lone warning block saving', () => {
    const issues = validateNodeData('condition', {
      condition: 'or',
      conditions: [{ condition: 'template', value_template: '{{ true }}' }],
    });

    expect(issues.map((e) => e.severity)).toEqual(['warning']);
    expect(hasBlockingValidationErrors(issues)).toBe(false);
  });
});
