import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NodeStatusBadge, nodeValidationClasses } from '../NodeStatusBadge';

function badgeHtml(props: {
  hasErrors: boolean;
  hasWarnings?: boolean;
  isDisabled?: boolean;
  messages: string[];
}): string {
  return renderToStaticMarkup(<NodeStatusBadge {...props} />);
}

describe('NodeStatusBadge', () => {
  it('shows the red error badge even when warnings exist too', () => {
    const html = badgeHtml({
      hasErrors: true,
      hasWarnings: true,
      messages: ['bad thing', 'meh thing'],
    });

    expect(html).toContain('bg-red-500');
    expect(html).not.toContain('bg-amber-500');
    expect(html).toContain('title="bad thing\nmeh thing"');
  });

  it('shows the amber warning badge when nothing is broken', () => {
    const html = badgeHtml({ hasErrors: false, hasWarnings: true, messages: ['only one'] });

    expect(html).toContain('bg-amber-500');
    expect(html).toContain('title="only one"');
  });

  it('falls back to the disabled badge', () => {
    const html = badgeHtml({ hasErrors: false, isDisabled: true, messages: [] });

    expect(html).toContain('bg-gray-500');
  });

  it('renders nothing for a healthy enabled node', () => {
    expect(badgeHtml({ hasErrors: false, messages: [] })).toBe('');
  });
});

describe('nodeValidationClasses', () => {
  it('prioritises the red ring', () => {
    expect(nodeValidationClasses(true, true)).toBe('border-red-500 ring-2 ring-red-400');
  });

  it('uses the amber ring for warnings alone', () => {
    expect(nodeValidationClasses(false, true)).toBe('border-amber-500 ring-2 ring-amber-300');
  });

  it('adds nothing for a valid node', () => {
    expect(nodeValidationClasses(false, false)).toBe('');
  });
});
