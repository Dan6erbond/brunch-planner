import type { ReactNode } from 'react'

export function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-svh max-w-xl content-start gap-6 px-4 py-6 pb-12">
      {children}
    </main>
  )
}
