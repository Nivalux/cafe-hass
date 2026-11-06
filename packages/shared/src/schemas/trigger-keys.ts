import type { TriggerPlatform } from './ha-entities';

export const TRIGGER_PLATFORM_KEYS = {
  state: ['entity_id', 'attribute', 'from', 'to', 'not_from', 'not_to', 'for'],
  numeric_state: ['entity_id', 'attribute', 'above', 'below', 'value_template', 'for'],
  zone: ['entity_id', 'zone', 'event'],
  sun: ['event', 'offset'],
  time: ['at'],
  time_pattern: ['hours', 'minutes', 'seconds'],
  event: ['event_type', 'event_data'],
  mqtt: ['topic', 'payload', 'value_template'],
  webhook: ['webhook_id'],
  template: ['value_template', 'for'],
  homeassistant: ['event'],
  scene: ['entity_id', 'target'],
} as const satisfies Partial<Record<TriggerPlatform, readonly string[]>>;

const EXTRA_KEY_OWNERS: Record<string, readonly string[]> = {
  device_id: ['device'],
};

function buildPlatformsByKey(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [platform, keys] of Object.entries(TRIGGER_PLATFORM_KEYS)) {
    for (const key of keys) {
      const owners = map.get(key);
      if (owners) {
        owners.add(platform);
      } else {
        map.set(key, new Set([platform]));
      }
    }
  }
  for (const [key, platforms] of Object.entries(EXTRA_KEY_OWNERS)) {
    map.set(key, new Set(platforms));
  }
  return map;
}

const PLATFORMS_BY_KEY: ReadonlyMap<string, ReadonlySet<string>> = buildPlatformsByKey();

export function isKnownTriggerPlatform(value: unknown): value is TriggerPlatform {
  return typeof value === 'string' && value in TRIGGER_PLATFORM_KEYS;
}

export function getForeignTriggerKeys(
  platform: unknown,
  data: Readonly<Record<string, unknown>>
): string[] {
  if (!isKnownTriggerPlatform(platform)) {
    return [];
  }
  return Object.keys(data).filter((key) => {
    const owners = PLATFORMS_BY_KEY.get(key);
    return owners !== undefined && !owners.has(platform);
  });
}

export function pickTriggerKeysForPlatform(
  platform: unknown,
  data: Record<string, unknown>
): Record<string, unknown> {
  const foreignKeys = getForeignTriggerKeys(platform, data);
  if (foreignKeys.length === 0) {
    return data;
  }
  return Object.fromEntries(Object.entries(data).filter(([key]) => !foreignKeys.includes(key)));
}

/**
 * C.A.F.E. stores a scene trigger as the `scene` platform with a flat
 * `entity_id`. Home Assistant registers it as `scene.activated` and takes its
 * scenes in a target selector, so the two shapes differ in both places.
 */
export const SCENE_TRIGGER_PLATFORM = 'scene';
export const SCENE_ACTIVATED_TRIGGER = 'scene.activated';

/**
 * The trigger block to write to YAML for a normalized C.A.F.E. trigger block.
 *
 * Platforms that name themselves the way C.A.F.E. stores them are returned
 * unchanged; only the scene trigger is renamed and has its scenes moved into
 * the `target` selector Home Assistant defines for it.
 */
export function toHomeAssistantTriggerBlock(
  block: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const name = typeof block.trigger === 'string' ? block.trigger : undefined;
  if (name !== SCENE_TRIGGER_PLATFORM && name !== SCENE_ACTIVATED_TRIGGER) {
    return { ...block };
  }

  const { trigger: _trigger, entity_id: entityId, target, ...rest } = block;
  const targetBlock = isRecord(target) ? target : undefined;
  const { entity_id: _targetEntityId, ...targetRest } = targetBlock ?? {};
  const scenes = entityId ?? getSceneTargetEntityId(target);

  if (scenes === undefined) {
    return { trigger: SCENE_ACTIVATED_TRIGGER, ...rest, ...(targetBlock ? { target } : {}) };
  }
  return {
    trigger: SCENE_ACTIVATED_TRIGGER,
    ...rest,
    target: { ...targetRest, entity_id: scenes },
  };
}

/**
 * The scenes a target selector of a scene trigger names.
 *
 * Used when reading Home Assistant YAML, where the scenes of a `scene.activated`
 * trigger live in `target` instead of the flat `entity_id` C.A.F.E. stores. A
 * target naming devices, areas or floors as well returns nothing, because the
 * editor has no fields for those and must not pretend they are scenes.
 */
export function getSceneTargetEntityId(target: unknown): string | string[] | undefined {
  if (!isRecord(target)) {
    return undefined;
  }
  const entityId = target.entity_id;
  if (typeof entityId === 'string') {
    return entityId;
  }
  return isStringArray(entityId) ? entityId : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string');
}
