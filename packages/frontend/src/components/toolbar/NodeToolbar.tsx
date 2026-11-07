import { Panel } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NodeActionBar } from './NodeActionBar';
import { groupNodeActions, useNodeActionShortcuts, useNodeActions } from './useNodeActions';

/** Canvas action panel. */
export function NodeToolbar() {
  const { context, actions } = useNodeActions();
  useNodeActionShortcuts(actions, context);

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
