import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  createWallet,
  fetchPendingBalances as fetchPendingBalancesApi,
  getWalletBalance,
  getWallets,
  seedMockData,
} from '@/services/api';
import type { Wallet } from '@/services/api';
import { formatAmount, shorten } from '@/utils/format';
import TransactionModal from '@/components/TransactionModal';
import MineModal from '@/components/MineModal';
import CreateWalletModal from '@/components/CreateWalletModal';

type Props = {
  onActivity?: () => void;
  active: boolean;
};

type WalletWithBalance = Wallet & { balance: number; pendingBalance?: number };

async function fetchWalletBalances(addresses: string[]): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};

  const uniqueAddresses = Array.from(new Set(addresses));
  const results = await Promise.all(
    uniqueAddresses.map(async (address) => {
      try {
        const balance = await getWalletBalance(address);
        return [address, balance] as const;
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'Balance fetch failed',
          message: error instanceof Error ? error.message : `Failed to load balance for ${address}`,
        });
        return [address, 0] as const;
      }
    }),
  );

  return Object.fromEntries(results) as Record<string, number>;
}

async function fetchPendingBalanceMap(addresses: string[]): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};

  try {
    return await fetchPendingBalancesApi(addresses);
  } catch (error) {
    notifications.show({
      color: 'red',
      title: 'Pending balance fetch failed',
      message: error instanceof Error ? error.message : 'Failed to load pending balances',
    });
    return {};
  }
}

export default function WalletsPage({ onActivity, active }: Props) {
  const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [createOpened, createHandlers] = useDisclosure(false);
  const [transactionOpened, transactionHandlers] = useDisclosure(false);
  const [mineOpened, mineHandlers] = useDisclosure(false);

  const applyBalances = async (addresses: string[]) => {
    const balances = await fetchWalletBalances(addresses);
    if (Object.keys(balances).length === 0) return;

    setWallets((prev) =>
      prev.map((wallet) =>
        balances[wallet.address] !== undefined
          ? { ...wallet, balance: balances[wallet.address] ?? wallet.balance }
          : wallet,
      ),
    );
  };

  const applyPendingBalances = async (addresses: string[]) => {
    const pending = await fetchPendingBalanceMap(addresses);
    if (Object.keys(pending).length === 0) return;

    setWallets((prev) =>
      prev.map((wallet) =>
        pending[wallet.address] !== undefined
          ? { ...wallet, pendingBalance: pending[wallet.address] ?? wallet.pendingBalance ?? 0 }
          : wallet,
      ),
    );
  };

  const fetchWallets = useCallback(async (showFullLoader = false): Promise<WalletWithBalance[]> => {
    if (showFullLoader) setLoading(true);

    let result: WalletWithBalance[] = [];
    try {
      const fetched = await getWallets();
      const addresses = fetched.map((wallet) => wallet.address);
      const [balances, pendingBalances] = await Promise.all([
        fetchWalletBalances(addresses),
        fetchPendingBalanceMap(addresses),
      ]);

      const withBalances = fetched.map((wallet) => ({
        ...wallet,
        balance: balances[wallet.address] ?? 0,
        pendingBalance: pendingBalances[wallet.address] ?? 0,
      }));

      setWallets(withBalances);
      result = withBalances;
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Load wallets failed',
        message: error instanceof Error ? error.message : 'Could not load wallets',
      });
    } finally {
      if (showFullLoader) setLoading(false);
    }

    return result;
  }, []);

  useEffect(() => {
    fetchWallets(true);
  }, [fetchWallets, active]);

  const handleCreateWallet = async (name: string) => {
    setCreating(true);
    try {
      const wallet = await createWallet(name);
      notifications.show({
        color: 'green',
        title: 'Wallet created',
        message: `New wallet ${wallet.name ?? shorten(wallet.address)} created successfully.`,
      });
      await fetchWallets(false);
      createHandlers.close();
      onActivity?.();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Create wallet failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCreating(false);
    }
  };

  const walletOptions = useMemo(() => wallets, [wallets]);

  // Change this to handle 'mempool balance'
  const handleTransactionSuccess = async () => {
    const latestWallets = await fetchWallets(false);
    const addresses = latestWallets.map((wallet) => wallet.address);
    await applyBalances(addresses);
    await applyPendingBalances(addresses);
    onActivity?.();
  };

  const handleMineSuccess = async () => {
    const latestWallets = await fetchWallets(false);
    const addresses =
      latestWallets.length > 0
        ? latestWallets.map((wallet) => wallet.address)
        : wallets.map((wallet) => wallet.address);
    await applyBalances(addresses);
    await applyPendingBalances(addresses);
    onActivity?.();
  };

  const handleSeedMockData = async () => {
    setSeeding(true);
    try {
      await seedMockData();
      notifications.show({
        color: 'green',
        title: 'Mock data seeded',
        message: 'Wallets and blocks populated with demo data.',
      });
      await fetchWallets(true);
      onActivity?.();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Seeding failed',
        message: error instanceof Error ? error.message : 'Could not populate mock data',
      });
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <Container py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  return (
    <Container py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title>Wallets overview</Title>
          <Text c="dimmed">Manage wallets, send transactions, and mine new blocks.</Text>
        </Stack>

        <Group>
          <Button onClick={createHandlers.open} loading={creating}>
            Create Wallet
          </Button>
          <Button variant="light" onClick={transactionHandlers.open} disabled={wallets.length < 2}>
            Send Transaction
          </Button>
          <Button variant="light" onClick={mineHandlers.open} disabled={wallets.length === 0}>
            Mine Block
          </Button>
          <Button variant="outline" onClick={handleSeedMockData} loading={seeding}>
            Seed Mock Data
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {wallets.map((wallet) => {
            const confirmedBalance = wallet.balance ?? 0;
            const pendingValue = wallet.pendingBalance ?? 0;
            const pendingDelta = pendingValue - confirmedBalance;
            let pendingDisplay = formatAmount(Math.abs(pendingDelta));
            if (pendingDelta > 0) {
              pendingDisplay = `+${pendingDisplay}`;
            } else if (pendingDelta < 0) {
              pendingDisplay = `-${pendingDisplay}`;
            }

            return (
              <Card key={wallet.address} withBorder shadow="sm" padding="lg">
                <Stack gap="xs">
                  <Text fw={600}>{wallet.name ?? shorten(wallet.address)}</Text>
                  <Group gap="xs" wrap="wrap">
                    <Badge color="cyan" variant="light">
                      {formatAmount(confirmedBalance)} coins
                    </Badge>
                    <Badge color="yellow" variant="outline">
                      Pending: {pendingDisplay} coins
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Address: {wallet.address}
                  </Text>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>

      <TransactionModal
        opened={transactionOpened}
        wallets={walletOptions}
        onClose={transactionHandlers.close}
        onSuccess={handleTransactionSuccess}
      />

      <MineModal
        opened={mineOpened}
        wallets={walletOptions}
        onClose={mineHandlers.close}
        onSuccess={handleMineSuccess}
      />

      <CreateWalletModal
        opened={createOpened}
        loading={creating}
        onClose={createHandlers.close}
        onSubmit={handleCreateWallet}
      />
    </Container>
  );
}
