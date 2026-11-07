import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NodeActionBar } from './NodeActionBar';
import { groupNodeActions, useNodeActions } from './useNodeActions';

/**
 * What a thumb reaches for first on a phone. Everything else stays one tap away
 * in the overflow menu, so no action is lost to the narrow header.
 */
const PRIMARY_ACTION_NAMES: readonly string[] = ['delete', 'duplicate', 'copy', 'toggle-enabled'];

/**
 * Node actions for the compact header, shown instead of the automation-level
 * buttons while something on the canvas is selected.
 */
export function NodeSelectionActions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { context, actions } = useNodeActions();

  const primary = actions.filter((action) => PRIMARY_ACTION_NAMES.includes(action.name));
  const overflow = groupNodeActions(
    actions.filter((action) => !PRIMARY_ACTION_NAMES.includes(action.name))
  );

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <NodeActionBar actions={primary} context={context} showSeparators={false} />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
            aria-label={t('buttons.moreActions')}
            title={t('buttons.moreActions')}
          >
            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {overflow.map((action) => {
            const Icon = action.getIcon ? action.getIcon(context) : action.icon;
            const tooltip =
              typeof action.tooltip === 'function' ? action.tooltip(context) : action.tooltip;
            const isEnabled = action.isEnabled ? action.isEnabled(context) : true;

            return (
              <DropdownMenuItem
                key={action.name}
                disabled={!isEnabled}
                onSelect={() => {
                  setOpen(false);
                  action.execute(context);
                }}
                className={
                  action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''
                }
              >
                <Icon className="mr-2 h-4 w-4" />
                {tooltip}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
