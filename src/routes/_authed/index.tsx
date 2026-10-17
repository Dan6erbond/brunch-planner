import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/')({ component: Home })

function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Your brunches</h1>
      <p className="mt-2 text-muted-foreground">
        Nothing planned yet. Menus and brunches are coming soon.
      </p>
    </div>
  )
}
