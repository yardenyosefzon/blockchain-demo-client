import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { getPrize, mineBlock } from '@/services/api';
import type { Wallet } from '@/services/api';
import { formatAmount, shorten } from '@/utils/format';

type Props = {
  opened: boolean;
  wallets: Wallet[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

export function MineModal({ opened, wallets, onClose, onSuccess }: Props) {
  const [miner, setMiner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [prizeLoading, setPrizeLoading] = useState(false);

  const loadPrize = useCallback(async () => {
    setPrizeLoading(true);
    try {
      const reward = await getPrize();
      setPrize(reward);
      return reward;
    } catch (error) {
      setPrize(null);
      notifications.show({
        color: 'red',
        title: 'Reward fetch failed',
        message: error instanceof Error ? error.message : 'Could not fetch the current block reward.',
      });
      return null;
    } finally {
      setPrizeLoading(false);
    }
  }, []);

  const ensurePrize = useCallback(async () => {
    if (prize !== null) return prize;
    return loadPrize();
  }, [loadPrize, prize]);

  useEffect(() => {
    if (!opened) {
      setMiner(null);
      setLoading(false);
      setPrize(null);
      setPrizeLoading(false);
      return;
    }
    loadPrize();
  }, [loadPrize, opened]);

  const options = useMemo(
    () =>
      wallets.map((wallet) => {
        const name = wallet.name ?? shorten(wallet.address);
        const publicKey = shorten(wallet.publicKey);
        return {
          value: wallet.address,
          label: publicKey ? `${name} (${publicKey})` : name,
        };
      }),
    [wallets],
  );

  const handleMine = async () => {
    if (!miner) return;
    setLoading(true);
    try {
      const rewardValue = await ensurePrize();
      const response = await mineBlock(miner);
      const minerWallet = wallets.find((wallet) => wallet.address === miner);
      const minerName = minerWallet?.name ?? (miner ? shorten(miner) : 'selected wallet');
      const baseMessage = response?.message ?? 'Pending transactions were mined into a new block.';
      const rewardMessage =
        rewardValue !== null
          ? ` Mining reward: ${formatAmount(rewardValue)} coins credited to ${minerName} (plus collected fees).`
          : '';
      notifications.show({
        color: 'green',
        title: '✅ Block mined successfully',
        message: `${baseMessage}${rewardMessage}`,
      });
      await onSuccess();
      onClose();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Mining failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Mine Block" closeOnClickOutside={false}>
      <Stack>
        <Text>
          Select the wallet that should receive the mining reward. Mining will include all pending
          transactions in the mempool.
        </Text>
        <Text size="sm" c="dimmed">
          {prizeLoading && 'Fetching the current block reward...'}
          {!prizeLoading && prize !== null && (
            <>
              The current block reward is {formatAmount(prize)} coins. This amount (plus transaction fees) will
              be added to the selected wallet if mining succeeds.
            </>
          )}
          {!prizeLoading && prize === null && 'Unable to fetch the current block reward right now.'}
        </Text>
        <Select
          label="Mining wallet"
          placeholder="Pick a wallet"
          data={options}
          value={miner}
          onChange={setMiner}
          searchable
          nothingFoundMessage="No wallets available"
        />
        <Button onClick={handleMine} disabled={!miner} loading={loading}>
          Mine Block
        </Button>
      </Stack>
    </Modal>
  );
}

export default MineModal;
