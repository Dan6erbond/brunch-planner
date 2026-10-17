import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'

export function MenusPending() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    </div>
  )
}

export function MenuEditorPending() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-80 max-w-full" />
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  )
}

export function MenusError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>Couldn’t load this page</AlertTitle>
      <AlertDescription>
        <p>
          {error instanceof Error ? error.message : 'Something went wrong.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
