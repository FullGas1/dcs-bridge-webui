import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ConnectionBanner from './ConnectionBanner.svelte';

afterEach(() => {
  cleanup();
});

describe('ConnectionBanner', () => {
  it('shows the static help text pointing at dcs-serve.yaml', () => {
    const { getByText } = render(ConnectionBanner, { props: { onSubmit: vi.fn() } });

    expect(getByText(/dcs-serve\.yaml/)).toBeInTheDocument();
    expect(getByText(/api_key/).closest('.connection-banner')).toBeInTheDocument();
  });

  it('starts with an empty api_key field and no failure message', () => {
    const { getByLabelText, queryByRole } = render(ConnectionBanner, { props: { onSubmit: vi.fn() } });

    expect((getByLabelText('api_key') as HTMLInputElement).value).toBe('');
    expect(queryByRole('status')).toBeNull();
  });

  it('submits the typed key and reports no failure on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const { getByLabelText, getByText, queryByRole } = render(ConnectionBanner, { props: { onSubmit } });

    await fireEvent.input(getByLabelText('api_key'), { target: { value: 'my-key' } });
    await fireEvent.click(getByText('Connect'));

    expect(onSubmit).toHaveBeenCalledWith('my-key');
    expect(queryByRole('status')).toBeNull();
  });

  it('shows a failure message when the connection attempt still fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const { getByLabelText, getByText, getByRole } = render(ConnectionBanner, { props: { onSubmit } });

    await fireEvent.input(getByLabelText('api_key'), { target: { value: 'wrong-key' } });
    await fireEvent.click(getByText('Connect'));

    expect(getByRole('status')).toHaveTextContent(/still/i);
  });

  it('accepts arbitrary text with no format validation', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const weird = 'áb!@#$%^&*()_+-={}[]|:;"\'<>,.?/~`\\';
    const { getByLabelText, getByText } = render(ConnectionBanner, { props: { onSubmit } });

    await fireEvent.input(getByLabelText('api_key'), { target: { value: weird } });
    await fireEvent.click(getByText('Connect'));

    expect(onSubmit).toHaveBeenCalledWith(weird);
  });
});
