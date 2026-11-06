import { AlertTriangle, Check, Copy, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useHass } from '@/contexts/HassContext';
import type { HomeAssistant } from '@/types/hass';
import { getHomeAssistantAPI } from '@/lib/ha-api';
import { resolveSaveAction } from '@/lib/save-action';
import { useFlowStore } from '@/store/flow-store';

const ALIAS_LOOKUP_DEBOUNCE_MS = 300;

interface AutomationSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (automationId: string) => void;
}

export function AutomationSaveDialog({ isOpen, onClose, onSaved }: AutomationSaveDialogProps) {
  const { t } = useTranslation(['common', 'dialogs', 'errors']);
  const {
    flowName,
    flowDescription,
    automationId,
    isSaving,
    setFlowName,
    setFlowDescription,
    setAutomationId,
    saveAutomation,
    updateAutomation,
  } = useFlowStore();

  const { hass } = useHass();

  const [localDescription, setLocalDescription] = useState(flowDescription);
  const [error, setError] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [openedAlias, setOpenedAlias] = useState(flowName);
  const [aliasOwner, setAliasOwner] = useState<{ alias: string; id: string | null } | null>(null);

  const isUpdate = !!automationId;
  const existingId = aliasOwner?.alias === flowName.trim() ? aliasOwner.id : null;
  const saveAction = resolveSaveAction({
    automationId,
    alias: flowName,
    originalAlias: openedAlias,
    existingId,
  });

  // Sync local description with store when dialog opens. The alias baseline is
  // read imperatively so typing doesn't move what counts as a rename.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setLocalDescription(flowDescription);
    setError(null);
    setSuggestedName(null);
    setOpenedAlias(useFlowStore.getState().flowName);
  }, [isOpen, flowDescription]);

  // Look up which automation owns the typed alias while the dialog is open
  useEffect(() => {
    if (!isOpen || !hass) {
      setAliasOwner(null);
      return;
    }

    const alias = flowName.trim();
    if (!alias) {
      setAliasOwner(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      const api = getHomeAssistantAPI(hass);
      const id = await api.getAutomationIdByAlias(alias);
      if (cancelled) {
        return;
      }
      setAliasOwner({ alias, id });
      setSuggestedName(
        id !== null && id !== automationId ? await api.getUniqueAutomationAlias(alias) : null
      );
    }, ALIAS_LOOKUP_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [isOpen, flowName, hass, automationId]);

  const saveToAutomation = async (targetId: string, hassApi: HomeAssistant) => {
    if (targetId !== automationId) {
      setAutomationId(targetId);
    }
    await updateAutomation(hassApi);

    return targetId;
  };

  const handleSave = async () => {
    if (!hass) {
      setError(t('errors:connection.notConnected'));
      return;
    }

    if (!flowName.trim()) {
      setError(t('errors:form.nameRequired'));
      return;
    }

    setError(null);

    try {
      // Update the flow store with the description
      setFlowDescription(localDescription.trim());

      const resultId = saveAction.targetId
        ? await saveToAutomation(saveAction.targetId, hass)
        : await saveAutomation(hass);

      onSaved?.(resultId);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors:api.unknownError');
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuggestedName(null);
    onClose();
  };

  const useSuggestedName = () => {
    if (suggestedName) {
      setFlowName(suggestedName);
      setSuggestedName(null);
    }
  };

  const handleSaveAsCopy = async () => {
    if (!hass) {
      setError(t('errors:connection.notConnected'));
      return;
    }

    setError(null);

    try {
      // Get a unique name for the copy
      const copyName = await getHomeAssistantAPI(hass).getUniqueAutomationAlias(flowName);
      setFlowName(copyName);
      setFlowDescription(localDescription.trim());

      // Clear the automation ID to force creating a new one
      setAutomationId(null);

      // Save as new automation
      const resultId = await saveAutomation(hass);

      onSaved?.(resultId);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors:api.unknownError');
      setError(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {t(saveAction.titleKey)}
          </DialogTitle>
          <DialogDescription>
            {saveAction.targetId
              ? t('dialogs:save.descriptionUpdate')
              : t('dialogs:save.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="automation-name">{t('dialogs:save.nameLabel')}</Label>
            <Input
              id="automation-name"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder={t('placeholders.enterAutomationName')}
              disabled={isSaving}
            />
          </div>

          {saveAction.foreignAliasId && (
            <Alert variant={isUpdate ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 break-words">
                  {isUpdate && suggestedName
                    ? t('dialogs:save.nameConflict', { suggestedName })
                    : t('dialogs:save.overwriteWarning')}
                </span>
                {suggestedName && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={useSuggestedName}
                    disabled={isSaving}
                    className="w-fit max-w-full whitespace-normal break-words"
                  >
                    {isUpdate ? t('buttons.use') : suggestedName}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="automation-description">{t('dialogs:save.descriptionLabel')}</Label>
            <Textarea
              id="automation-description"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder={t('placeholders.describeAutomation')}
              rows={3}
              disabled={isSaving}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              {t('buttons.cancel')}
            </Button>
            {(isUpdate || saveAction.foreignAliasId) && (
              <Button
                variant="outline"
                onClick={handleSaveAsCopy}
                disabled={isSaving || !flowName.trim()}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {t('buttons.saveAsCopy')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !flowName.trim()}
              className="whitespace-normal"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUpdate ? t('status.updating') : t('status.saving')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t(saveAction.labelKey)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
