import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import TemplateDropdown from './TemplateDropdown.svelte';
import type { Template } from './api';

afterEach(() => {
  cleanup();
});

const templates: Template[] = [
  { id: '1', name: 'check menu', code: 'return checkMenu()' },
  { id: '2', name: 'spawn test', code: 'return spawnTest()' },
];

describe('TemplateDropdown', () => {
  it('is closed by default', () => {
    const { queryByRole } = render(TemplateDropdown, {
      props: { templates, onSelect: vi.fn(), onDelete: vi.fn() },
    });

    expect(queryByRole('listbox')).toBeNull();
  });

  it('lists every template by name when opened', async () => {
    const { getByText, getByRole } = render(TemplateDropdown, {
      props: { templates, onSelect: vi.fn(), onDelete: vi.fn() },
    });

    await fireEvent.click(getByText('Templates'));

    expect(getByRole('listbox')).toBeInTheDocument();
    expect(getByText('check menu')).toBeInTheDocument();
    expect(getByText('spawn test')).toBeInTheDocument();
  });

  it('shows a placeholder when there are no templates', async () => {
    const { getByText } = render(TemplateDropdown, {
      props: { templates: [], onSelect: vi.fn(), onDelete: vi.fn() },
    });

    await fireEvent.click(getByText('Templates'));

    expect(getByText('No templates yet')).toBeInTheDocument();
  });

  it('calls onSelect with the chosen template and closes the list', async () => {
    const onSelect = vi.fn();
    const { getByText, queryByRole } = render(TemplateDropdown, {
      props: { templates, onSelect, onDelete: vi.fn() },
    });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByText('check menu'));

    expect(onSelect).toHaveBeenCalledWith(templates[0]);
    expect(queryByRole('listbox')).toBeNull();
  });

  it('calls onDelete with the template id, without triggering onSelect', async () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    const { getByText, getByLabelText } = render(TemplateDropdown, {
      props: { templates, onSelect, onDelete },
    });

    await fireEvent.click(getByText('Templates'));
    await fireEvent.click(getByLabelText('Delete template check menu'));

    expect(onDelete).toHaveBeenCalledWith('1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
