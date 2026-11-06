import { AlertCircle, AlertTriangle, Ban } from 'lucide-react';

interface NodeStatusBadgeProps {
  hasErrors: boolean;
  hasWarnings?: boolean;
  isDisabled?: boolean;
  messages: string[];
}

/**
 * Corner indicator for a node's validation state.
 *
 * Errors block saving and render red. Warnings render amber and stay saveable:
 * a single-condition AND/OR group is valid YAML, just almost never what the
 * author meant, and blocking on it would make the canvas unusable.
 */
export function NodeStatusBadge({
  hasErrors,
  hasWarnings = false,
  isDisabled = false,
  messages,
}: NodeStatusBadgeProps) {
  if (hasErrors) {
    return (
      <div
        className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
        title={messages.join('\n')}
      >
        <AlertCircle className="h-3 w-3" />
      </div>
    );
  }

  if (hasWarnings) {
    return (
      <div
        className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm"
        title={messages.join('\n')}
      >
        <AlertTriangle className="h-3 w-3" />
      </div>
    );
  }

  if (isDisabled) {
    return (
      <div className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-500 text-white shadow-sm">
        <Ban className="h-3 w-3" />
      </div>
    );
  }

  return null;
}

export function nodeValidationClasses(hasErrors: boolean, hasWarnings = false): string {
  if (hasErrors) {
    return 'border-red-500 ring-2 ring-red-400';
  }

  if (hasWarnings) {
    return 'border-amber-500 ring-2 ring-amber-300';
  }

  return '';
}
