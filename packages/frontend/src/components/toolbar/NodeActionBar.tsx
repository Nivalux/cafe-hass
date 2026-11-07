import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { NodeAction, NodeActionContext } from '../actions';
import { formatShortcut, readClipboardNodeCount } from './useNodeActions';

interface NodeActionBarProps {
  actions: readonly NodeAction[];
  context: NodeActionContext;
  className?: string;
  /** Drop the group separators, for bars that only ever show one group. */
  showSeparators?: boolean;
}

function ActionButton({ action, context }: { action: NodeAction; context: NodeActionContext }) {
  const { t } = useTranslation();
  const Icon = action.getIcon ? action.getIcon(context) : action.icon;
  const tooltip = typeof action.tooltip === 'function' ? action.tooltip(context) : action.tooltip;
  const isEnabled = action.isEnabled ? action.isEnabled(context) : true;
  const clipboardNodeCount =
    action.name === 'paste' ? readClipboardNodeCount(context.clipboard) : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={!isEnabled}
      className={cn(
        'relative h-8 w-8 shrink-0',
        'sm:h-9 sm:w-9',
        action.variant === 'destructive' &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive'
      )}
      title={
        action.shortcut
          ? `${tooltip} (${formatShortcut(
              Array.isArray(action.shortcut) ? action.shortcut[0] : action.shortcut,
              t
            )})`
          : tooltip
      }
      aria-label={tooltip}
      onClick={() => action.execute(context)}
    >
      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      {clipboardNodeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary font-bold text-[9px] text-primary-foreground">
          {clipboardNodeCount}
        </span>
      )}
    </Button>
  );
}

/**
 * Row of action buttons. Used by the canvas panel and, on phones, by the header,
 * so both stay in sync whenever an action is added.
 */
export function NodeActionBar({
  actions,
  context,
  className,
  showSeparators = true,
}: NodeActionBarProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-0.5 sm:gap-1', className)}>
      {actions.map((action, index) => (
        <Fragment key={action.name}>
          {showSeparators && index > 0 && actions[index - 1]?.group !== action.group && (
            <Separator orientation="vertical" className="mx-0.5 h-6 sm:mx-1" />
          )}
          <ActionButton action={action} context={context} />
        </Fragment>
      ))}
    </div>
  );
}
