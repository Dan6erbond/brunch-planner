import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { authQueries, useSignOut } from '#/lib/queries/auth'
import { profileQueries } from '#/lib/queries/profiles'

const themeOptions = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
] as const

function ThemeSwitcher() {
  const { theme = 'system', setTheme } = useTheme()
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1.5">
      <span className="text-xs text-muted-foreground">Theme</span>
      <ToggleGroup
        className="w-full"
        variant="outline"
        size="sm"
        spacing={0}
        value={[theme]}
        onValueChange={(next) => {
          const [value] = next
          if (value) setTheme(value)
        }}
      >
        {themeOptions.map(({ value, label, Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={label}
            className="min-w-0 flex-1 px-2"
          >
            <Icon />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session } = useSuspenseQuery(authQueries.session())
  const signOut = useSignOut()

  const email = session?.user.email ?? ''
  const { data: profile } = useSuspenseQuery(profileQueries.me())
  const name = profile?.display_name || email

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-heading text-lg font-semibold">
              Brunch Planner
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="gap-2 px-2" />}
            >
              <Avatar size="sm">
                <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-40 truncate sm:inline">{name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate">
                  {email}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <ThemeSwitcher />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={signOut.isPending}
                onClick={() => {
                  signOut.mutate(undefined, {
                    onSuccess: () => {
                      router.history.push('/login')
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  })
                }}
              >
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  )
}
