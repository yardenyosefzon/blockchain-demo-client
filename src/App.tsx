import { useState } from 'react';
import { AppShell, Group, Tabs, Title } from '@mantine/core';
import WalletsPage from '@/pages/WalletsPage';
import BlockchainPage from '@/pages/BlockchainPage';

const NAV_TABS = [
  { value: 'wallets', label: 'Wallets' },
  { value: 'blockchain', label: 'Blockchain' },
];

const HEADER_HEIGHT = { base: 112, sm: 70 };

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(NAV_TABS[0]?.value ?? 'wallets');

  return (
    <AppShell
      padding="0"
      header={{ height: HEADER_HEIGHT }}
      withBorder={false}
      styles={{
        main: {
          padding: 0,
          paddingTop: 'var(--app-shell-header-offset, 0px)',
        },
      }}
    >
      <AppShell.Header>
        <Group
          justify="space-between"
          align="center"
          px="lg"
          py="sm"
          h="100%"
          gap="xs"
          wrap="wrap"
        >
          <Title order={3}>Blockchain Demo</Title>
          <Tabs
            value={activeTab}
            onChange={(value) => value && setActiveTab(value)}
            variant="outline"
            keepMounted={false}
          >
            <Tabs.List>
              {NAV_TABS.map((tab) => (
                <Tabs.Tab key={tab.value} value={tab.value}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Tabs value={activeTab}>
          <Tabs.Panel value="wallets">
            <WalletsPage active={activeTab === 'wallets'} />
          </Tabs.Panel>
          <Tabs.Panel value="blockchain">
            <BlockchainPage active={activeTab === 'blockchain'} />
          </Tabs.Panel>
        </Tabs>
      </AppShell.Main>
    </AppShell>
  );
}
