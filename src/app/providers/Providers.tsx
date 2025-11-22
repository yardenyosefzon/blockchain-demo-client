import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/app/store';
import { theme } from '@/app/theme';

type Props = { children: ReactNode };

export function Providers({ children }: Props) {
  return (
    <ReduxProvider store={store}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" limit={3} />
        {children}
      </MantineProvider>
    </ReduxProvider>
  );
}

// Named export only to avoid import/no-named-as-default noise
