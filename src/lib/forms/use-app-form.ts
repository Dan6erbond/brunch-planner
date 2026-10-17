import { createFormHook } from '@tanstack/react-form'
import { SubmitButton } from '#/components/form/submit-button'
import { TextareaField } from '#/components/form/textarea-field'
import { TextField } from '#/components/form/text-field'
import { fieldContext, formContext } from './form-context'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField },
  formComponents: { SubmitButton },
})
