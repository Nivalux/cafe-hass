import type { ConditionType } from '@cafe/shared';
import { Plus, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DynamicFieldRenderer } from '@/components/ui/DynamicFieldRenderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getConditionDefaults,
  getConditionFields,
  isLogicalGroupType,
} from '@/config/conditionFields';
import { useHass } from '@/contexts/HassContext';
import { cn } from '@/lib/utils';
import type { ConditionNodeData } from '@/store/flow-store';
import type { HassEntity } from '@/types/hass';

interface ConditionGroupEditorProps {
  conditions: ConditionNodeData[];
  onChange: (newConditions: ConditionNodeData[]) => void;
  /** Null when the parent is a plain condition carrying a list, not a logical group. */
  parentType: 'and' | 'or' | 'not' | null;
  depth?: number;
}

const CONDITION_TYPES = [
  { value: 'state', labelKey: 'nodes:conditions.types.state' },
  { value: 'numeric_state', labelKey: 'nodes:conditions.types.numeric_state' },
  { value: 'template', labelKey: 'nodes:conditions.types.template' },
  { value: 'trigger', labelKey: 'nodes:conditions.types.trigger' },
  { value: 'zone', labelKey: 'nodes:conditions.types.zone' },
  { value: 'time', labelKey: 'nodes:conditions.types.time' },
  { value: 'sun', labelKey: 'nodes:conditions.types.sun' },
  { value: 'and', labelKey: 'nodes:conditions.types.and' },
  { value: 'or', labelKey: 'nodes:conditions.types.or' },
  { value: 'not', labelKey: 'nodes:conditions.types.not' },
] as const;

/**
 * Renders fields for a condition type using the shared config from conditionFields.ts.
 * Translations are handled using i18next.
 */
function ConditionTypeFields({
  cond,
  onUpdate,
  entities,
}: {
  cond: ConditionNodeData;
  onUpdate: (newCond: ConditionNodeData) => void;
  entities: HassEntity[];
}) {
  const condType = (cond.condition || 'state') as ConditionType;
  const fields = getConditionFields(condType);

  // No fields for this condition type (e.g., device handled elsewhere)
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <DynamicFieldRenderer
          key={field.name}
          field={field}
          value={(cond as Record<string, unknown>)[field.name]}
          onChange={(value) => onUpdate({ ...cond, [field.name]: value })}
          entities={entities}
        />
      ))}
    </div>
  );
}

/**
 * Single condition item card
 */
function ConditionCard({
  cond,
  onUpdate,
  onRemove,
  entities,
  depth,
}: {
  cond: ConditionNodeData;
  onUpdate: (newCond: ConditionNodeData) => void;
  onRemove: () => void;
  entities: HassEntity[];
  depth: number;
}) {
  const condType = (cond.condition || 'state') as ConditionType;
  const isGroup = isLogicalGroupType(condType);
  const { t } = useTranslation(['common', 'nodes', 'panels']);

  const handleTypeChange = (val: string) => {
    onUpdate(getConditionDefaults(val as ConditionType) as ConditionNodeData);
  };

  return (
    <div className={cn('space-y-3 rounded-md border bg-card p-3', depth > 0 && 'bg-muted/30')}>
      {/* Header row: type selector and delete button */}
      <div className="flex items-center justify-between gap-2">
        <Select value={cond.condition || 'state'} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full max-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Condition-specific fields */}
      {isGroup ? (
        <ConditionGroupEditor
          conditions={(cond.conditions as ConditionNodeData[]) || []}
          onChange={(newConds) => onUpdate({ ...cond, conditions: newConds })}
          parentType={cond.condition as 'and' | 'or' | 'not'}
          depth={depth + 1}
        />
      ) : (
        <ConditionTypeFields cond={cond} onUpdate={onUpdate} entities={entities} />
      )}
    </div>
  );
}

type GroupHint = 'empty' | 'single' | null;

/**
 * Mirrors validateConditionTree in @cafe/shared: an empty AND/OR checks nothing
 * at all in Home Assistant, a single one is the same as no group. NOT negates
 * fine on its own, so it only ever complains about being empty.
 */
function getGroupHint(parentType: 'and' | 'or' | 'not' | null, count: number): GroupHint {
  if (parentType === null) {
    return null;
  }

  if (count === 0) {
    return parentType === 'not' ? null : 'empty';
  }

  if (count === 1 && parentType !== 'not') {
    return 'single';
  }

  return null;
}

function GroupHintNotice({ hint }: { hint: Exclude<GroupHint, null> }) {
  const { t } = useTranslation(['panels']);

  return (
    <p
      className={cn(
        'rounded border px-2 py-1 text-xs',
        hint === 'empty'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-amber-400/60 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
      )}
    >
      {hint === 'empty'
        ? t('panels:conditionGroupEditor.emptyGroupHint')
        : t('panels:conditionGroupEditor.singleConditionHint')}
    </p>
  );
}

export const ConditionGroupEditor = memo(function ConditionGroupEditor({
  conditions,
  onChange,
  parentType,
  depth = 0,
}: ConditionGroupEditorProps) {
  const { hass } = useHass();
  const entities = hass ? Object.values(hass.states) : [];
  const { t } = useTranslation(['common', 'nodes', 'panels']);

  const handleAdd = () => {
    onChange([...conditions, { condition: 'state', entity_id: '', state: '' }]);
  };

  const handleRemove = (idx: number) => {
    onChange(conditions.filter((_, i) => i !== idx));
  };

  const handleUpdate = (idx: number, newCond: ConditionNodeData) => {
    onChange(conditions.map((c, i) => (i === idx ? newCond : c)));
  };

  const hint = getGroupHint(parentType, conditions.length);

  return (
    <div className={cn('space-y-2', depth > 0 && 'border-muted border-l-2 pl-2')}>
      {hint && <GroupHintNotice hint={hint} />}
      {conditions.length === 0 ? (
        <p className="py-2 text-muted-foreground text-xs italic">
          {t('panels:conditionGroupEditor.noConditions')}
        </p>
      ) : (
        conditions.map((cond, idx) => (
          <ConditionCard
            key={idx}
            cond={cond}
            onUpdate={(newCond) => handleUpdate(idx, newCond)}
            onRemove={() => handleRemove(idx)}
            entities={entities}
            depth={depth}
          />
        ))
      )}
      <Button size="sm" variant="outline" onClick={handleAdd} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        {t('panels:conditionGroupEditor.addCondition')}
      </Button>
    </div>
  );
});
