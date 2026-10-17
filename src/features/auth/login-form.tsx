import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { FieldGroup } from '#/components/ui/field'
import { loginFormOptions } from '#/lib/forms/auth'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useSignIn } from '#/lib/queries/auth'
import { AuthCard } from './auth-card'

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const signIn = useSignIn()

  const form = useAppForm({
    ...loginFormOptions,
    onSubmit: async ({ value }) => {
      try {
        await signIn.mutateAsync(value)
        router.history.push(redirectTo ?? '/')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

  return (
    <AuthCard
      title="Log in"
      description="Sign in to plan your brunches."
      footerText="New here?"
      footerLinkLabel="Create an account"
      footerLinkTo="/register"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <field.TextField
                label="Password"
                type="password"
                autoComplete="current-password"
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton
              size="lg"
              label="Log in"
              pendingLabel="Logging in…"
            />
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
