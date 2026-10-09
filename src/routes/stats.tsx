import { createFileRoute } from '@tanstack/react-router';
import { StatsStub } from './-index.tsx';

export const Route = createFileRoute('/stats')({
  component: StatsStub,
});
