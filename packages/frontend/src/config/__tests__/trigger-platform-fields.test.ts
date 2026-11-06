// @vitest-environment node
import { getForeignTriggerKeys } from '@cafe/shared';
import { describe, expect, it } from 'vitest';
import { getTriggerFields, TRIGGER_PLATFORM_FIELDS } from '../triggerFields';

describe('Trigger platform field configurations', () => {
  it('only offers fields the platform itself accepts', () => {
    for (const [platform, fields] of Object.entries(TRIGGER_PLATFORM_FIELDS)) {
      const data = Object.fromEntries(fields.map((field) => [field.name, 'value']));
      expect(getForeignTriggerKeys(platform, data)).toEqual([]);
    }
  });

  it('lets a scene trigger pick only scenes', () => {
    expect(getTriggerFields('scene')).toEqual([
      expect.objectContaining({
        name: 'entity_id',
        type: 'entity',
        multiple: true,
        domainFilter: 'scene',
      }),
    ]);
  });
});
