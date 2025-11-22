import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { getChain, getWallets, remineBlock, updateBlock, validateChain } from '@/services/api';
import type { Block } from '@/services/api';
import { shorten } from '@/utils/format';
import {
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from '@mantine/core';

type Props = {
  active?: boolean;
};

export default function BlockchainPage({ active }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editedBlocks, setEditedBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [walletMap, setWalletMap] = useState<Record<string, string>>({});
  const [invalidBlockIndexes, setInvalidBlockIndexes] = useState<number[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [remineLoading, setRemineLoading] = useState<Record<number, boolean>>({});
  const theme = useMantineTheme();
  const blockUpdateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const invalidBlockSet = useMemo(() => new Set(invalidBlockIndexes), [invalidBlockIndexes]);

  const cancelPendingBlockUpdates = useCallback(() => {
    Object.values(blockUpdateTimers.current).forEach((timer) => {
      clearTimeout(timer);
    });
    blockUpdateTimers.current = {};
  }, []);

  const initiateChain = useCallback(async () => {
    setLoading(true);
    try {
      const chain = await getChain();
      setBlocks(chain);
      setEditedBlocks(chain);
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to load blockchain',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChain = async () => {
    setLoading(true);
    cancelPendingBlockUpdates();
    try {
      const chain = await getChain();
      setEditedBlocks(chain);
      setInvalidBlockIndexes([]);
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to load blockchain',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWallets = useCallback(async () => {
    try {
      const wallets = await getWallets();
      const nextMap = wallets.reduce<Record<string, string>>((acc, wallet) => {
        const accCopy = acc;
        accCopy[wallet.address] = wallet.name ?? shorten(wallet.address);
        return accCopy;
      }, {});
      setWalletMap(nextMap);
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to load wallets',
        message: error instanceof Error ? error.message : 'Could not load wallet names',
      });
    }
  }, []);

  useEffect(
    () => () => {
      cancelPendingBlockUpdates();
    },
    [cancelPendingBlockUpdates],
  );

  useEffect(() => {
    initiateChain();
    loadWallets();
  }, [initiateChain, loadWallets, active]);

  const resolveAddressLabel = (address?: string | null) => {
    if (!address) return 'Unknown';
    return walletMap[address] ?? shorten(address);
  };

  const handleUpdateBlock = async (block: Block) => {
    try {
      await updateBlock({
        index: block.index,
        previous_hash: block.previous_hash,
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to update chain',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const scheduleBlockUpdate = (block: Block) => {
    const pending = blockUpdateTimers.current[block.index];
    if (pending) {
      clearTimeout(pending);
    }
    blockUpdateTimers.current[block.index] = setTimeout(() => {
      handleUpdateBlock(block);
      delete blockUpdateTimers.current[block.index];
    }, 500);
  };

  const handleBlockFieldChange = (blockIndex: number, field: 'previous_hash', value: string) => {
    setEditedBlocks((prevBlocks) => {
      const nextBlocks = prevBlocks.map((block) =>
        block.index === blockIndex ? { ...block, [field]: value } : block,
      );
      const updatedBlock = nextBlocks.find((block) => block.index === blockIndex);
      if (updatedBlock) {
        scheduleBlockUpdate(updatedBlock);
      }
      return nextBlocks;
    });
  };

  const handleRestoreBlocks = async () => {
    if (blocks.length === 0) return;
    cancelPendingBlockUpdates();
    setRestoring(true);
    try {
      const originalsByIndex = blocks.reduce<Record<number, Block>>((acc, block) => {
        const accCopy = acc;
        accCopy[block.index] = block;
        return accCopy;
      }, {});

      const blocksToRestore = editedBlocks
        .map((block) => {
          const original = originalsByIndex[block.index];
          if (!original) return null;
          if (block.hash === original.hash && block.previous_hash === original.previous_hash) {
            return null;
          }
          return original;
        })
        .filter((block): block is Block => block !== null);

      if (blocksToRestore.length > 0) {
        await Promise.all(blocksToRestore.map((block) => handleUpdateBlock(block)));
      }

      setEditedBlocks(blocks);
      setInvalidBlockIndexes([]);
      notifications.show({
        color: 'blue',
        title: 'Blocks restored',
        message: 'Blocks returned to their last loaded state.',
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to restore blocks',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await validateChain();
      const invalidEntries = result.entries.filter((entry) => !entry.valid);
      const invalidIndexes = invalidEntries.map((entry) => entry.index);
      setInvalidBlockIndexes(invalidIndexes);

      if (result.isValid || invalidIndexes.length === 0) {
        notifications.show({
          color: 'green',
          title: 'Blockchain validated',
          message: '✅ Chain integrity verified successfully.',
        });
      } else {
        const invalidSummary =
          invalidIndexes.length > 0
            ? `Blocks ${invalidIndexes.map((index) => `#${index}`).join(', ')}`
            : 'Some blocks';
        notifications.show({
          color: 'red',
          title: 'Blockchain invalid',
          message: `❌ Validation failed. ${invalidSummary} require attention.`,
        });
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleRemineBlock = async (blockIndex: number) => {
    setRemineLoading((prev) => ({ ...prev, [blockIndex]: true }));
    try {
      await remineBlock(blockIndex);
      notifications.show({
        color: 'blue',
        title: `Remining block #${blockIndex}`,
        message: 'Block submitted for re-mining.',
      });
      await loadChain();
      await handleValidate();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to remine block',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRemineLoading((prev) => {
        const next = { ...prev };
        delete next[blockIndex];
        return next;
      });
    }
  };

  return (
    <Container py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>Blockchain</Title>
            <Text c="dimmed">Browse mined blocks and inspect their transactions.</Text>
          </Stack>
          <Group>
            <Button
              variant="outline"
              color="red"
              onClick={handleRestoreBlocks}
              loading={restoring}
              disabled={blocks.length === 0 || loading}
            >
              Restore blocks
            </Button>
            <Button onClick={handleValidate} loading={validating}>
              Validate chain
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          {!loading && blocks.length === 0 && <Text>No blocks mined yet.</Text>}
          {editedBlocks.map((block) => {
            const blockTransactions = block.transactions ?? block.data?.transactions ?? [];
            const hasTransactions = blockTransactions.length > 0;
            const isBlockInvalid = invalidBlockSet.has(block.index);
            const isRemining = remineLoading[block.index] ?? false;
            return (
              <Card
                key={block.index}
                withBorder
                shadow="sm"
                padding="lg"
                bg={isBlockInvalid ? theme.colors.red[7] : undefined}
                style={
                  isBlockInvalid
                    ? {
                        borderColor: theme.colors.red[9] ?? theme.colors.red[8],
                        color: theme.white,
                      }
                    : undefined
                }
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Title order={4}>Block #{block.index}</Title>
                    {isBlockInvalid && (
                      <Button
                        size="xs"
                        variant="white"
                        color="red"
                        onClick={() => handleRemineBlock(block.index)}
                        loading={isRemining}
                      >
                        Remine
                      </Button>
                    )}
                  </Group>
                  <Stack gap={4}>
                    <Text size="sm" fw={500}>
                      Hash
                    </Text>
                    <Text size="sm" ff="monospace">
                      {block.hash}
                    </Text>
                  </Stack>
                  <TextInput
                    label="Previous hash"
                    value={block.previous_hash}
                    onChange={(event) =>
                      handleBlockFieldChange(
                        block.index,
                        'previous_hash',
                        event.currentTarget.value,
                      )
                    }
                  />
                  {block.data?.type && <Text size="sm">Type: {block.data.type}</Text>}
                  {block.difficulty !== undefined && (
                    <Text size="sm">Difficulty: {block.difficulty}</Text>
                  )}
                  {block.mining_time !== undefined && (
                    <Text size="sm">Mining time: {block.mining_time} sec</Text>
                  )}
                  {block.timestamp && <Text size="sm">Timestamp: {block.timestamp}</Text>}
                  {block.data?.coinbase && (
                    <Text size="sm">
                      Coinbase reward: {block.data.coinbase.amount ?? '-'} ➜{' '}
                      {resolveAddressLabel(block.data.coinbase.receiver_address)}
                    </Text>
                  )}
                  {Array.isArray(block.data?.alloc) && block.data.alloc.length > 0 && (
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        Genesis allocations:
                      </Text>
                      {block.data.alloc.map((allocation, index) => (
                        <Text key={`${allocation.receiver_address ?? index}`} size="sm">
                          {resolveAddressLabel(allocation.receiver_address)} received{' '}
                          {allocation.value ?? '-'}
                        </Text>
                      ))}
                    </Stack>
                  )}

                  <Divider label="Transactions" labelPosition="center" />
                  <Stack gap="xs">
                    {hasTransactions ? (
                      blockTransactions.map((tx, index) => (
                        <Card key={`${tx.hash ?? index}`} padding="md" withBorder>
                          <Stack gap={4}>
                            <Text size="sm">
                              <Text span fw={500}>
                                From:
                              </Text>{' '}
                              {resolveAddressLabel(tx.sender ?? tx.sender_address)}
                            </Text>
                            <Text size="sm">
                              <Text span fw={500}>
                                To:
                              </Text>{' '}
                              {resolveAddressLabel(tx.receiver ?? tx.receiver_address)}
                            </Text>
                            <Text size="sm">
                              <Text span fw={500}>
                                Amount:
                              </Text>{' '}
                              {tx.amount}
                            </Text>
                            {tx.fee !== undefined && (
                              <Text size="sm">
                                <Text span fw={500}>
                                  Fee:
                                </Text>{' '}
                                {tx.fee}
                              </Text>
                            )}
                            {tx.note && (
                              <Text size="sm">
                                <Text span fw={500}>
                                  Note:
                                </Text>{' '}
                                {tx.note}
                              </Text>
                            )}
                            {tx.status && (
                              <Text size="sm" c={isBlockInvalid ? 'white' : 'dimmed'}>
                                Status: {tx.status}
                              </Text>
                            )}
                          </Stack>
                        </Card>
                      ))
                    ) : (
                      <Text c={isBlockInvalid ? 'white' : 'dimmed'}>
                        No transactions in this block.
                      </Text>
                    )}
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}
