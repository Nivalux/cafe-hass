import { mkdirSync, writeFileSync } from 'node:fs';
import type { FlowGraph } from '@cafe/shared';
import { v4 as uuidv4 } from 'uuid';
import { FlowTranspiler } from '../../packages/transpiler/src/FlowTranspiler';
import { YamlParser } from '../../packages/transpiler/src/parser/YamlParser';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: emit.ts <output-dir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const pos = { x: 0, y: 0 };
const edge = (source: string, target: string) => ({ id: `${source}-${target}`, source, target });

function graph(nodes: FlowGraph['nodes'], edges?: FlowGraph['edges']): FlowGraph {
  return {
    id: uuidv4(),
    name: 'C.A.F.E. validation fixture',
    nodes,
    edges: edges ?? nodes.slice(1).map((node, i) => edge(nodes[i].id, node.id)),
    version: 1,
    metadata: { mode: 'single', initial_state: false },
  };
}

const action = {
  id: 'action',
  type: 'action',
  position: pos,
  data: { service: 'light.turn_on' },
} as const;

const flows: Record<string, FlowGraph> = {
  'sun-drops-state-keys': graph([
    {
      id: 'trigger',
      type: 'trigger',
      position: pos,
      data: { trigger: 'sun', event: 'sunset', entity_id: 'light.living', from: 'on', to: 'off' },
    },
    action,
  ]),
  'zone-drops-for': graph([
    {
      id: 'trigger',
      type: 'trigger',
      position: pos,
      data: { trigger: 'zone', entity_id: 'person.test', zone: 'zone.home', for: { minutes: 5 } },
    },
    action,
  ]),
  'state-machine-drops-state-keys': graph(
    [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: pos,
        data: { trigger: 'sun', event: 'sunset', entity_id: 'light.living' },
      },
      {
        id: 'trigger-2',
        type: 'trigger',
        position: pos,
        data: { trigger: 'sun', event: 'sunrise' },
      },
      action,
      { id: 'action-2', type: 'action', position: pos, data: { service: 'light.turn_off' } },
    ],
    [edge('trigger-1', 'action'), edge('trigger-2', 'action-2')]
  ),
  'scene-moves-scenes-into-target': graph([
    {
      id: 'trigger',
      type: 'trigger',
      position: pos,
      data: { trigger: 'scene', entity_id: ['scene.test', 'scene.evening'], to: 'on' },
    },
    action,
  ]),
  'wait-for-trigger-drops-state-keys': graph([
    {
      id: 'trigger',
      type: 'trigger',
      position: pos,
      data: { trigger: 'state', entity_id: 'input_boolean.test' },
    },
    {
      id: 'wait',
      type: 'wait',
      position: pos,
      data: {
        wait_for_trigger: [{ trigger: 'sun', event: 'sunset', entity_id: 'light.living', for: 60 }],
      },
    },
    action,
  ]),
};

// Device triggers and third-party platforms need registries and integrations a bare
// Home Assistant does not have; they are covered by the unit tests instead.

const roundTrips: Record<string, string> = {
  'sun-offset-zero-from-ha-editor': `
alias: Sunset lights
triggers:
  - trigger: sun
    event: sunset
    offset: 0
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
  'sun-offset-positive': `
alias: Sunset lights
triggers:
  - trigger: sun
    event: sunset
    offset: "+00:30:00"
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
  'sun-offset-negative': `
alias: Sunset lights
triggers:
  - trigger: sun
    event: sunset
    offset: "-00:30:00"
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
  'scene-activated-from-ha-editor': `
alias: Scene lights
triggers:
  - trigger: scene.activated
    target:
      entity_id:
        - scene.test
        - scene.evening
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
};

const invalid: Record<string, string> = {
  'must-fail-scene-with-flat-entity-id': `
alias: Scene lights
triggers:
  - trigger: scene
    entity_id: scene.test
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
  'must-fail-sun-with-state-keys': `
alias: Sunset lights
triggers:
  - trigger: sun
    event: sunset
    entity_id: light.living
conditions: []
actions:
  - action: light.turn_on
    target:
      entity_id: light.living
mode: single
`,
};

const transpiler = new FlowTranspiler();
const parser = new YamlParser();

for (const [name, flow] of Object.entries(flows)) {
  const result = transpiler.transpile(flow);
  if (!result.success || !result.yaml) {
    console.error(`transpiling ${name} failed: ${result.errors}`);
    process.exit(1);
  }
  writeFileSync(`${outDir}/${name}.yaml`, result.yaml);
}

for (const [name, yaml] of Object.entries(roundTrips)) {
  const parsed = await parser.parse(yaml);
  if (!parsed.success || !parsed.graph) {
    console.error(`parsing ${name} failed: ${JSON.stringify(parsed.errors)}`);
    process.exit(1);
  }
  const result = transpiler.transpile(parsed.graph);
  if (!result.success || !result.yaml) {
    console.error(`transpiling ${name} failed: ${result.errors}`);
    process.exit(1);
  }
  writeFileSync(`${outDir}/${name}.yaml`, result.yaml);
}

for (const [name, yaml] of Object.entries(invalid)) {
  writeFileSync(`${outDir}/${name}.yaml`, yaml);
}

console.log(`emitted fixtures to ${outDir}`);
