import { isBlockingValidationError, type NodeValidationError } from '@cafe/shared';
import { useMemo } from 'react';
import { useFlowStore } from '@/store/flow-store';

/**
 * Hook to get validation errors for a specific node.
 * Used by node components to display error indicators on the canvas.
 *
 * Warnings are reported separately: they highlight a node amber but never block
 * saving, so every consumer that decides "can this be saved" reads `hasErrors`.
 */
export function useNodeErrors(nodeId: string): {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: NodeValidationError[];
  errorMessages: string[];
  warningMessages: string[];
  getFieldError: (fieldPath: string) => string | undefined;
  getRootError: () => string | undefined;
} {
  const errors = useFlowStore((s) => s.nodeErrors.get(nodeId));

  const result = useMemo(() => {
    const all = errors ?? [];
    const errorList = all.filter(isBlockingValidationError);
    const warningList = all.filter((error) => !isBlockingValidationError(error));

    /**
     * Get error message for a specific field path.
     * @param fieldPath - The field path (e.g., 'service', 'delay', 'wait_template')
     */
    const getFieldError = (fieldPath: string): string | undefined => {
      const fieldError = errorList.find((e) => e.path.includes(fieldPath));
      return fieldError?.message;
    };

    /**
     * Get root-level error (errors with path '_root' or empty path).
     * Used for cross-field validation errors.
     */
    const getRootError = (): string | undefined => {
      const rootError = errorList.find((e) => e.path.includes('_root') || e.path.length === 0);
      return rootError?.message;
    };

    return {
      hasErrors: errorList.length > 0,
      hasWarnings: warningList.length > 0,
      errors: errorList,
      errorMessages: errorList.map((e) => e.message),
      warningMessages: warningList.map((e) => e.message),
      getFieldError,
      getRootError,
    };
  }, [errors]);

  return result;
}

/**
 * Hook to get all validation errors across all nodes.
 * Used by save dialogs and other components that need a global view.
 */
export function useAllNodeErrors(): {
  hasErrors: boolean;
  errorCount: number;
  nodeErrors: Map<string, NodeValidationError[]>;
} {
  const nodeErrors = useFlowStore((s) => s.nodeErrors);

  return useMemo(() => {
    const blocking = [...nodeErrors.entries()].filter(([, list]) =>
      list.some(isBlockingValidationError)
    );

    return {
      hasErrors: blocking.length > 0,
      errorCount: blocking.length,
      nodeErrors,
    };
  }, [nodeErrors]);
}
