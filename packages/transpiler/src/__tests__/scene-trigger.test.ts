// @vitest-environment node
import type { FlowGraph, TriggerNode } from '@cafe/shared';
import { load as yamlLoad } from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { FlowTranspiler } from '../FlowTranspiler';
import { YamlParser } from '../parser/YamlParser';

const automation = (triggers: string) => `
alias: Scene activated lights
description: ""
triggers:
${triggers}
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`;

const parser = new YamlParser();
const transpiler = new FlowTranspiler();

function triggersOf(yaml: string): Record<string, unknown>[] {
  return (yamlLoad(yaml) as { triggers: Record<string, unknown>[] }).triggers;
}

function flowOf(triggerData: TriggerNode['data']): FlowGraph {
  return {
    id: uuidv4(),
    name: 'Scene trigger',
    description: '',
    nodes: [
      { id: 'trigger-1', type: 'trigger', position: { x: 0, y: 0 }, data: triggerData },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 200, y: 0 },
        data: { service: 'light.turn_on' },
      },
    ],
    edges: [{ id: 'e-t1-a1', source: 'trigger-1', target: 'action-1' }],
    version: 1,
    metadata: { mode: 'single', initial_state: false },
  };
}

describe('Scene triggers', () => {
  it('reads a scene.activated trigger as the scene platform', async () => {
    const parsed = await parser.parse(
      automation(`  - trigger: scene.activated
    target:
      entity_id: scene.movie_time`)
    );

    expect(parsed.success).toBe(true);
    expect(parsed.graph?.nodes[0]?.data).toMatchObject({
      trigger: 'scene',
      entity_id: 'scene.movie_time',
    });
  });

  it('writes the scenes back into the target of the scene.activated trigger', async () => {
    const parsed = await parser.parse(
      automation(`  - trigger: scene.activated
    target:
      entity_id:
        - scene.movie_time
        - scene.bedtime`)
    );
    expect(parsed.success).toBe(true);

    expect(triggersOf(transpiler.toYaml(parsed.graph!))).toEqual([
      {
        trigger: 'scene.activated',
        target: { entity_id: ['scene.movie_time', 'scene.bedtime'] },
      },
    ]);
  });

  it('transpiles a scene node of the editor into a scene.activated trigger', () => {
    const output = transpiler.transpile(flowOf({ trigger: 'scene', entity_id: 'scene.movie' }));

    expect(output.success).toBe(true);
    expect(triggersOf(output.yaml!)).toEqual([
      { trigger: 'scene.activated', target: { entity_id: 'scene.movie' } },
    ]);
  });

  it('drops the state keys a scene trigger never had', () => {
    const output = transpiler.transpile(
      flowOf({ trigger: 'scene', entity_id: 'scene.movie', to: 'on', from: 'off', for: 60 })
    );

    expect(output.success).toBe(true);
    expect(triggersOf(output.yaml!)).toEqual([
      { trigger: 'scene.activated', target: { entity_id: 'scene.movie' } },
    ]);
  });

  it('keeps a target that selects more than scenes through a round trip', async () => {
    const parsed = await parser.parse(
      automation(`  - trigger: scene.activated
    target:
      device_id: 6f1a2b`)
    );
    expect(parsed.success).toBe(true);

    expect(triggersOf(transpiler.toYaml(parsed.graph!))).toEqual([
      { trigger: 'scene.activated', target: { device_id: '6f1a2b' } },
    ]);
  });

  it('shapes a scene trigger inside wait_for_trigger as well', () => {
    const flow: FlowGraph = {
      id: uuidv4(),
      name: 'Wait for a scene',
      description: '',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 0, y: 0 },
          data: { trigger: 'state', entity_id: 'input_boolean.test' },
        },
        {
          id: 'wait-1',
          type: 'wait',
          position: { x: 200, y: 0 },
          data: { wait_for_trigger: [{ trigger: 'scene', entity_id: 'scene.movie' }] },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 400, y: 0 },
          data: { service: 'light.turn_off' },
        },
      ],
      edges: [
        { id: 'e-t1-w1', source: 'trigger-1', target: 'wait-1' },
        { id: 'e-w1-a1', source: 'wait-1', target: 'action-1' },
      ],
      version: 1,
      metadata: { mode: 'single', initial_state: false },
    };

    const output = transpiler.transpile(flow);
    expect(output.success).toBe(true);

    const wait = (
      yamlLoad(output.yaml!) as { actions: { wait_for_trigger?: Record<string, unknown>[] }[] }
    ).actions.find((step) => 'wait_for_trigger' in step);
    expect(wait?.wait_for_trigger).toEqual([
      { trigger: 'scene.activated', target: { entity_id: 'scene.movie' } },
    ]);
  });
});
