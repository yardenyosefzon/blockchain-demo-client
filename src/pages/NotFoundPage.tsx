import { Center, Stack, Text, Title } from '@mantine/core';

export default function NotFoundPage() {
  return (
    <Center h="100%">
      <Stack gap="xs" align="center">
        <Title order={2}>404</Title>
        <Text>Page not found</Text>
      </Stack>
    </Center>
  );
}
