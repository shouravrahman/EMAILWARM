'use client';

import { WarmupPoolManager } from '@/components/admin/warmup-pool-manager';

export default function WarmupPoolPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Warmup Pool Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage email addresses used for warmup campaigns
          </p>
        </div>
        <WarmupPoolManager />
      </div>
    </div>
  );
}
