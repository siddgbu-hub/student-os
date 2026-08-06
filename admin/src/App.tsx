import React from 'react';
import { Button } from '@student-os/ui';

export const App: React.FC = () => {
  return (
    <div style={{ padding: 'var(--spacing-xl)' }}>
      <h1>Student OS Admin Panel</h1>
      <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
        System Administration & Management (Milestone 1 Foundation)
      </p>
      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <Button variant="secondary">Admin Foundation Active</Button>
      </div>
    </div>
  );
};
