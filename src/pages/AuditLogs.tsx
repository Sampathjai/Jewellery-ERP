import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AuditLogViewer } from '@/components/common/AuditLogViewer';
import { getLocalDb } from '@/lib/supabase';

export const AuditLogs: React.FC = () => {
  const db = getLocalDb();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Track critical administrative operations, price modifications, permissions changes, and cancellations"
        breadcrumb={['Home', 'Audit Logs']}
      />

      <AuditLogViewer logs={db.auditLogs} />
    </div>
  );
};

