// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  getForeignTriggerKeys,
  isKnownTriggerPlatform,
  pickTriggerKeysForPlatform,
  toHomeAssistantTriggerBlock,
} from '../schemas/trigger-keys';
import { HATriggerSchema } from '../schemas/ha-schemas';

describe('Home Assistant 2026.10 trigger platform key compatibility', () => {
  it('reports state trigger keys left on a sun trigger', () => {
    expect(
      getForeignTriggerKeys('sun', {
        trigger: 'sun',
        event: 'sunset',
        offset: '+00:30:00',
        entity_id: 'light.living',
        from: 'on',
        to: 'off',
        alias: 'At sunset',
      })
    ).toEqual(['entity_id', 'from', 'to']);
  });

  it('keeps the keys of the platform itself and the shared ones', () => {
    const data = {
      trigger: 'state',
      entity_id: 'binary_sensor.motion',
      attribute: 'brightness',
      from: 'on',
      to: 'off',
      not_from: ['off'],
      not_to: ['on'],
      for: { minutes: 5 },
      alias: 'Motion',
      id: 'motion_trigger',
      enabled: true,
      variables: { a: 1 },
      options: {},
    };
    expect(getForeignTriggerKeys('state', data)).toEqual([]);
  });

  it('treats keys owned by several platforms as shared', () => {
    expect(
      getForeignTriggerKeys('zone', { trigger: 'zone', entity_id: 'person.a', event: 'enter' })
    ).toEqual([]);
    expect(
      getForeignTriggerKeys('numeric_state', {
        trigger: 'numeric_state',
        entity_id: 'sensor.a',
        for: 60,
      })
    ).toEqual([]);
    expect(
      getForeignTriggerKeys('mqtt', { trigger: 'mqtt', topic: 'x', value_template: '{{ 1 }}' })
    ).toEqual([]);
  });

  it('reports keys of other platforms', () => {
    expect(
      getForeignTriggerKeys('state', { trigger: 'state', offset: '00:30:00', topic: 'x' })
    ).toEqual(['offset', 'topic']);
    expect(
      getForeignTriggerKeys('sun', { trigger: 'sun', event: 'sunset', for: { minutes: 5 } })
    ).toEqual(['for']);
    expect(
      getForeignTriggerKeys('zone', { trigger: 'zone', zone: 'zone.home', attribute: 'battery' })
    ).toEqual(['attribute']);
    expect(
      getForeignTriggerKeys('template', {
        trigger: 'template',
        value_template: '{{ 1 }}',
        entity_id: 'a.b',
      })
    ).toEqual(['entity_id']);
    expect(getForeignTriggerKeys('state', { trigger: 'state', device_id: 'abc' })).toEqual([
      'device_id',
    ]);
  });

  it('never strips device triggers, whose schema comes from the device registry', () => {
    expect(isKnownTriggerPlatform('device')).toBe(false);
    const data = {
      trigger: 'device',
      device_id: 'abc',
      domain: 'sensor',
      type: 'changed_states',
      entity_id: 'sensor.a',
      above: 10,
    };
    expect(getForeignTriggerKeys('device', data)).toEqual([]);
    expect(pickTriggerKeysForPlatform('device', data)).toEqual(data);
  });

  it('never strips platforms C.A.F.E. does not know', () => {
    const data = {
      trigger: 'power.crossed_threshold',
      target: { device_id: 'abc' },
      above: 100,
    };
    expect(isKnownTriggerPlatform('power.crossed_threshold')).toBe(false);
    expect(getForeignTriggerKeys('power.crossed_threshold', data)).toEqual([]);
  });

  it('ignores a missing platform', () => {
    expect(getForeignTriggerKeys(undefined, { device_id: 'abc' })).toEqual([]);
  });

  it('returns the same object when nothing has to be dropped', () => {
    const data = { trigger: 'sun', event: 'sunset' };
    expect(pickTriggerKeysForPlatform('sun', data)).toBe(data);
  });

  it('keeps the scenes of a scene trigger and reports the state keys it never had', () => {
    expect(
      getForeignTriggerKeys('scene', {
        trigger: 'scene',
        entity_id: 'scene.movie_time',
        to: 'on',
        from: 'off',
        for: { minutes: 5 },
      })
    ).toEqual(['to', 'from', 'for']);
  });

  it('reports a target left on a platform that takes none', () => {
    expect(
      getForeignTriggerKeys('state', {
        trigger: 'state',
        entity_id: 'light.living',
        target: { entity_id: 'light.living' },
      })
    ).toEqual(['target']);
  });

  it('drops the foreign keys and keeps the rest', () => {
    expect(
      pickTriggerKeysForPlatform('sun', {
        trigger: 'sun',
        event: 'sunset',
        offset: '+00:30:00',
        entity_id: 'light.living',
        to: 'off',
      })
    ).toEqual({ trigger: 'sun', event: 'sunset', offset: '+00:30:00' });
  });
});

describe('Trigger blocks Home Assistant shapes differently from node data', () => {
  it('writes the scenes of a scene trigger into its target', () => {
    expect(
      toHomeAssistantTriggerBlock({ trigger: 'scene', entity_id: ['scene.movie', 'scene.bed'] })
    ).toEqual({
      trigger: 'scene.activated',
      target: { entity_id: ['scene.movie', 'scene.bed'] },
    });
  });

  it('accepts a scene trigger that already stores its scenes in a target', () => {
    expect(
      toHomeAssistantTriggerBlock({ trigger: 'scene', target: { entity_id: 'scene.movie' } })
    ).toEqual({ trigger: 'scene.activated', target: { entity_id: 'scene.movie' } });
  });

  it('leaves the block of every other platform as it is', () => {
    const block = { trigger: 'state', entity_id: 'light.living', to: 'on' };
    expect(toHomeAssistantTriggerBlock(block)).toEqual(block);
  });

  it('reads the scenes of a scene.activated trigger back into a flat entity_id', () => {
    expect(
      HATriggerSchema.parse({ trigger: 'scene.activated', target: { entity_id: 'scene.movie' } })
    ).toEqual({ trigger: 'scene', entity_id: 'scene.movie' });
    expect(
      HATriggerSchema.parse({
        trigger: 'scene.activated',
        target: { entity_id: ['scene.movie', 'scene.bed'] },
      })
    ).toEqual({ trigger: 'scene', entity_id: ['scene.movie', 'scene.bed'] });
  });

  it('keeps a target that selects more than scenes', () => {
    expect(
      HATriggerSchema.parse({ trigger: 'scene.activated', target: { device_id: 'abc' } })
    ).toEqual({ trigger: 'scene', target: { device_id: 'abc' } });
  });

  it('normalizes the legacy platform key of platforms that need no reshape', () => {
    expect(HATriggerSchema.parse({ platform: 'sun', event: 'sunset' })).toEqual({
      trigger: 'sun',
      event: 'sunset',
    });
  });
});
