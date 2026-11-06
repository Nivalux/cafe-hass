import { describe, expect, it } from 'vitest';
import { resolveSaveAction } from '../save-action';

describe('resolveSaveAction', () => {
  it('creates a new automation when nothing owns the alias', () => {
    const action = resolveSaveAction({
      automationId: null,
      alias: 'Weihnachtsbeleuchtung',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: null,
    });

    expect(action).toEqual({
      kind: 'create',
      labelKey: 'buttons.create',
      titleKey: 'dialogs:save.title',
      targetId: null,
      foreignAliasId: null,
    });
  });

  it('overwrites the existing automation when an imported flow reuses its alias', () => {
    const action = resolveSaveAction({
      automationId: null,
      alias: 'Weihnachtsbeleuchtung',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: 'a1',
    });

    expect(action.kind).toBe('overwrite');
    expect(action.labelKey).toBe('buttons.overwrite');
    expect(action.titleKey).toBe('dialogs:save.titleOverwrite');
    expect(action.targetId).toBe('a1');
    expect(action.foreignAliasId).toBe('a1');
  });

  it('updates the linked automation when the alias is unchanged', () => {
    const action = resolveSaveAction({
      automationId: 'a1',
      alias: 'Weihnachtsbeleuchtung',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: 'a1',
    });

    expect(action.kind).toBe('update');
    expect(action.labelKey).toBe('buttons.update');
    expect(action.targetId).toBe('a1');
    expect(action.foreignAliasId).toBe(null);
  });

  it('renames when a linked automation gets a free alias', () => {
    const action = resolveSaveAction({
      automationId: 'a1',
      alias: 'Weihnachtsbeleuchtung OG',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: null,
    });

    expect(action.kind).toBe('rename');
    expect(action.labelKey).toBe('buttons.rename');
    expect(action.targetId).toBe('a1');
  });

  it('treats whitespace-only alias changes as an update', () => {
    const action = resolveSaveAction({
      automationId: 'a1',
      alias: '  Weihnachtsbeleuchtung  ',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: 'a1',
    });

    expect(action.kind).toBe('update');
  });

  it('keeps updating its own automation when another one took the typed alias', () => {
    const action = resolveSaveAction({
      automationId: 'a1',
      alias: 'Flurlicht',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: 'b2',
    });

    expect(action.kind).toBe('update');
    expect(action.targetId).toBe('a1');
    expect(action.foreignAliasId).toBe('b2');
  });

  it('stays quiet when the name was not touched, even if the ids disagree', () => {
    const action = resolveSaveAction({
      automationId: 'og-weihnachtsbeleuchtung',
      alias: 'OG Weihnachtsbeleuchtung',
      originalAlias: 'OG Weihnachtsbeleuchtung',
      existingId: '1793983423886',
    });

    expect(action.kind).toBe('update');
    expect(action.foreignAliasId).toBe(null);
    expect(action.targetId).toBe('og-weihnachtsbeleuchtung');
  });

  it('ignores a lookup result that points at the linked automation', () => {
    const action = resolveSaveAction({
      automationId: 'a1',
      alias: 'Weihnachtsbeleuchtung',
      originalAlias: 'Weihnachtsbeleuchtung',
      existingId: 'a1',
    });

    expect(action.foreignAliasId).toBe(null);
  });
});
