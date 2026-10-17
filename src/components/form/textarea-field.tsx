import type { ComponentProps } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { useFieldContext } from '#/lib/forms/form-context'

type TextareaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  'id' | 'name' | 'value' | 'onChange' | 'onBlur'
> & { label: string }

export function TextareaField({ label, ...textareaProps }: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        aria-invalid={invalid}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        {...textareaProps}
      />
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
