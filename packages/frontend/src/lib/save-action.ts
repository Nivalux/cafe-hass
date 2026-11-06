export type SaveActionKind = 'create' | 'update' | 'rename' | 'overwrite';

export interface SaveActionInput {
  automationId: string | null;
  alias: string;
  originalAlias: string;
  existingId: string | null;
}

export type SaveLabelKey =
  | 'buttons.create'
  | 'buttons.update'
  | 'buttons.rename'
  | 'buttons.overwrite';

export type SaveTitleKey =
  | 'dialogs:save.title'
  | 'dialogs:save.titleUpdate'
  | 'dialogs:save.titleOverwrite';

export interface SaveAction {
  kind: SaveActionKind;
  labelKey: SaveLabelKey;
  titleKey: SaveTitleKey;
  targetId: string | null;
  foreignAliasId: string | null;
}

const LABELS: Record<SaveActionKind, SaveLabelKey> = {
  create: 'buttons.create',
  update: 'buttons.update',
  rename: 'buttons.rename',
  overwrite: 'buttons.overwrite',
};

const TITLES: Record<SaveActionKind, SaveTitleKey> = {
  create: 'dialogs:save.title',
  update: 'dialogs:save.titleUpdate',
  rename: 'dialogs:save.titleUpdate',
  overwrite: 'dialogs:save.titleOverwrite',
};

export function resolveSaveAction({
  automationId,
  alias,
  originalAlias,
  existingId,
}: SaveActionInput): SaveAction {
  const foreignAliasId = existingId && existingId !== automationId ? existingId : null;

  const renamed = alias.trim() !== originalAlias.trim();
  const conflictId = automationId && !renamed ? null : foreignAliasId;

  const build = (kind: SaveActionKind, targetId: string | null): SaveAction => ({
    kind,
    labelKey: LABELS[kind],
    titleKey: TITLES[kind],
    targetId,
    foreignAliasId: conflictId,
  });

  if (!automationId) {
    return foreignAliasId ? build('overwrite', foreignAliasId) : build('create', null);
  }

  if (conflictId) {
    return build('update', automationId);
  }

  return renamed ? build('rename', automationId) : build('update', automationId);
}
