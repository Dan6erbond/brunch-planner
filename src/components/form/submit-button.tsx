import { useSelector } from '@tanstack/react-form'
import type { ComponentProps } from 'react'
import { Button } from '#/components/ui/button'
import { useFormContext } from '#/lib/forms/form-context'

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, 'type'> & {
  label: string
  pendingLabel: string
}

export function SubmitButton({
  label,
  pendingLabel,
  disabled,
  ...buttonProps
}: SubmitButtonProps) {
  const form = useFormContext()
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting)
  return (
    <Button
      type="submit"
      disabled={disabled === true || isSubmitting}
      {...buttonProps}
    >
      {isSubmitting ? pendingLabel : label}
    </Button>
  )
}
