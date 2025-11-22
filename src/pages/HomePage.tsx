import { Button, Container, Group, Text, Title } from '@mantine/core';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchApiStatus } from '@/features/app.thunks';

export default function HomePage() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.app.status);
  const loading = useAppSelector((s) => s.app.loading);
  const error = useAppSelector((s) => s.app.error);

  return (
    <Container py="xl">
      <Title mb="sm">Blockchain Client</Title>
      <Text c="dimmed" mb="lg">
        Vite + React + TypeScript + Mantine + Redux Toolkit
      </Text>
      <Group>
        <Button loading={loading} onClick={() => dispatch(fetchApiStatus())}>
          Ping Flask API
        </Button>
        {status && <Text>API: {status}</Text>}
        {error && <Text c="red">Error: {error}</Text>}
      </Group>
    </Container>
  );
}
