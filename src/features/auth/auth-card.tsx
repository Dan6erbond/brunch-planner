import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

type AuthCardProps = {
  title: string
  description: string
  children: ReactNode
  footerText: string
  footerLinkLabel: string
  footerLinkTo: '/login' | '/register'
}

export function AuthCard({
  title,
  description,
  children,
  footerText,
  footerLinkLabel,
  footerLinkTo,
}: AuthCardProps) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center gap-1 text-sm">
          <span className="text-muted-foreground">{footerText}</span>
          <Link to={footerLinkTo} className="font-medium underline">
            {footerLinkLabel}
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
