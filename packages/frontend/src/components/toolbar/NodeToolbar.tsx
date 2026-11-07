import { Panel } from '@xyflow/react';
import { useCompactLayout } from '@/hooks/useCompactLayout';
import { cn } from '@/lib/utils';
import { NodeActionBar } from './NodeActionBar';
import { groupNodeActions, useNodeActionShortcuts, useNodeActions } from './useNodeActions';

/**
 * Canvas action panel. On phones the header takes over while a node is selected,
 * since the properties panel covers the canvas there.
 */
export function NodeToolbar() {
  const { context, actions } = useNodeActions();
  const { isCompactLayout } = useCompactLayout();
  useNodeActionShortcuts(actions, context);

  if (isCompactLayout && context.selectedNodes.length > 0) {
    return null;
  }

  return (
    <Panel
      position="top-center"
      className="!m-0 !p-0 max-w-[calc(100%-0.5rem)] sm:max-w-[calc(100%-2rem)]"
    >
      <div
        className={cn(
          'ml-6 flex items-center gap-0.5 rounded-lg border bg-background/95 px-1.5 py-1 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:ml-4 sm:gap-1 sm:px-2 sm:py-1.5 lg:ml-0',
          'fade-in slide-in-from-top-2 animate-in duration-200',
          'scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent overflow-x-auto',
          'max-w-full'
        )}
      >
        <NodeActionBar actions={groupNodeActions(actions)} context={context} />
      </div>
    </Panel>
  );
}
