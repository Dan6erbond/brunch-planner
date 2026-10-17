import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { FieldGroup } from '#/components/ui/field'
import { registerFormOptions } from '#/lib/forms/auth'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useSignUp } from '#/lib/queries/auth'
import { AuthCard } from './auth-card'

export function RegisterForm() {
  const router = useRouter()
  const signUp = useSignUp()
  const [pendingEmail, setPendingEmail] = useState<string>()

  const form = useAppForm({
    ...registerFormOptions,
    onSubmit: async ({ value }) => {
      try {
        const data = await signUp.mutateAsync(value)
        if (data.session) {
          router.history.push('/')
        } else {
          setPendingEmail(value.email)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

  if (pendingEmail) {
    return (
      <AuthCard
        title="Check your email"
        description={`We sent a confirmation link to ${pendingEmail}. Open it to activate your account, then log in.`}
        footerText="Already confirmed?"
        footerLinkLabel="Log in"
        footerLinkTo="/login"
      >
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPendingEmail(undefined)
          }}
        >
          Use a different email
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Create an account"
      description="Host brunches and build shopping lists."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerLinkTo="/login"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.AppField name="displayName">
            {(field) => <field.TextField label="Name" autoComplete="name" />}
          </form.AppField>
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
                autoComplete="new-password"
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton
              size="lg"
              label="Create account"
              pendingLabel="Creating account…"
            />
          </form.AppForm>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
