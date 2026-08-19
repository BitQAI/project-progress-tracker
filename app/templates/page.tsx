'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { TemplateManager } from '@/components/TemplateManager';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useRouter } from 'next/navigation';

export default function TemplatesPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900">
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TemplateManager />
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(id) => router.push(`/projects/${id}`)}
      />
    </div>
  );
}
