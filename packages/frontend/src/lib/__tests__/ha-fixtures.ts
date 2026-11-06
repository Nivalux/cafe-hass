import type { HomeAssistant } from '@/types/hass';
import { vi } from 'vitest';

export function makeHass(entities: Record<string, string>): HomeAssistant {
  const states: Record<string, unknown> = {};
  for (const [entityId, friendlyName] of Object.entries(entities)) {
    states[entityId] = {
      entity_id: entityId,
      attributes: { friendly_name: friendlyName },
    };
  }

  return {
    connection: null,
    states,
    callApi: vi.fn(),
    callService: vi.fn(),
  } as unknown as HomeAssistant;
}

export function makeConnectedHass(configs: unknown[]): HomeAssistant {
  const hass = makeHass({});
  Object.assign(hass, { connection: { sendMessagePromise: vi.fn().mockResolvedValue(configs) } });

  return hass;
}
