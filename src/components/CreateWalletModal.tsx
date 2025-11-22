import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';

type Props = {
  opened: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export default function CreateWalletModal({ opened, loading, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) {
      setName('');
      setError(null);
    }
  }, [opened]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a wallet name.');
      return;
    }
    setError(null);
    await onSubmit(trimmed);
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Create Wallet">
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Wallet name"
            placeholder="Enter a name for this wallet"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            error={error}
            disabled={loading}
            required
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
