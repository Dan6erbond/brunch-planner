import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'

export function NoAccess({
  title,
  backTo,
  backLabel,
}: {
  title: string
  backTo: LinkProps['to']
  backLabel: string
}) {
  return (
    <div className="grid justify-items-start gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">
        This may not exist, or you don’t have access to it.
      </p>
      <Button variant="outline" render={<Link to={backTo} />}>
        <ArrowLeftIcon />
        {backLabel}
      </Button>
    </div>
  )
}
