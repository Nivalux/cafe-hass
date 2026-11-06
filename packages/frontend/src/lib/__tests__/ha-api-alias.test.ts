import type { HomeAssistant } from '@/types/hass';
import { describe, expect, it, vi } from 'vitest';
import { HomeAssistantAPI } from '../ha-api';
import { makeHass } from './ha-fixtures';

describe('HomeAssistantAPI.getAutomationIdByAlias', () => {
  it('returns the id of the automation that owns the alias', async () => {
    const api = new HomeAssistantAPI(
      makeHass({
        'automation.og_weihnachtsbeleuchtung': 'OG Weihnachtsbeleuchtung',
        'automation.flur': 'Flurlicht',
      })
    );

    await expect(api.getAutomationIdByAlias('OG Weihnachtsbeleuchtung')).resolves.toBe(
      'og_weihnachtsbeleuchtung'
    );
  });

  it('ignores surrounding whitespace in the alias', async () => {
    const api = new HomeAssistantAPI(makeHass({ 'automation.flur': 'Flurlicht' }));

    await expect(api.getAutomationIdByAlias('  Flurlicht  ')).resolves.toBe('flur');
  });

  it('returns null when no automation uses the alias', async () => {
    const api = new HomeAssistantAPI(makeHass({ 'automation.flur': 'Flurlicht' }));

    await expect(api.getAutomationIdByAlias('Kueche')).resolves.toBeNull();
  });

  it('returns null for an empty alias without hitting Home Assistant', async () => {
    const api = new HomeAssistantAPI(makeHass({ 'automation.flur': 'Flurlicht' }));

    await expect(api.getAutomationIdByAlias('   ')).resolves.toBeNull();
  });

  it('returns null when the automation list cannot be read', async () => {
    const hass = {
      connection: null,
      get states(): Record<string, never> {
        throw new Error('boom');
      },
      callApi: vi.fn(),
      callService: vi.fn(),
    } as unknown as HomeAssistant;
    const api = new HomeAssistantAPI(hass);

    await expect(api.getAutomationIdByAlias('Flurlicht')).resolves.toBeNull();
  });
});
