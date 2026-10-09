import { createFileRoute } from '@tanstack/react-router';
import { SettingsStub } from './-index.tsx';

export const Route = createFileRoute('/settings')({
  component: SettingsStub,
});
