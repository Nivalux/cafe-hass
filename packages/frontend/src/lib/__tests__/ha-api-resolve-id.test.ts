import { describe, expect, it } from 'vitest';
import { HomeAssistantAPI } from '../ha-api';
import { makeConnectedHass, makeHass } from './ha-fixtures';

describe('HomeAssistantAPI.resolveAutomationId', () => {
  it('keeps the id when Home Assistant knows that automation', async () => {
    const api = new HomeAssistantAPI(
      makeConnectedHass([{ id: '1793983423886', alias: 'OG Weihnachtsbeleuchtung' }])
    );

    await expect(
      api.resolveAutomationId('1793983423886', 'OG Weihnachtsbeleuchtung')
    ).resolves.toBe('1793983423886');
  });

  it('replaces an entity slug with the real config id', async () => {
    const api = new HomeAssistantAPI(
      makeConnectedHass([{ id: '1793983423886', alias: 'OG Weihnachtsbeleuchtung' }])
    );

    await expect(
      api.resolveAutomationId('og-weihnachtsbeleuchtung', 'OG Weihnachtsbeleuchtung')
    ).resolves.toBe('1793983423886');
  });

  it('refuses to guess when several automations share the alias', async () => {
    const api = new HomeAssistantAPI(
      makeConnectedHass([
        { id: '111', alias: 'Weihnachtsbeleuchtung' },
        { id: '222', alias: 'Weihnachtsbeleuchtung' },
      ])
    );

    await expect(
      api.resolveAutomationId('weihnachtsbeleuchtung', 'Weihnachtsbeleuchtung')
    ).rejects.toThrow(/does not match exactly one automation/);
  });

  it('passes the id through when the config list cannot be read', async () => {
    const api = new HomeAssistantAPI(makeHass({}));

    await expect(api.resolveAutomationId('whatever', 'Etwas')).resolves.toBe('whatever');
  });
});
