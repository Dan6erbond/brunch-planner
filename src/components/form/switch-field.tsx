import { useId } from 'react'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '#/components/ui/field'
import { Switch } from '#/components/ui/switch'
import { useFieldContext } from '#/lib/forms/form-context'

type SwitchFieldProps = {
  label: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

export function SwitchField({
  label,
  description,
  onCheckedChange,
}: SwitchFieldProps) {
  const field = useFieldContext<boolean>()
  const id = useId()
  return (
    <Field orientation="horizontal" className="w-auto">
      <Switch
        id={id}
        name={field.name}
        size="sm"
        checked={field.state.value}
        onCheckedChange={(checked) => {
          field.handleChange(checked)
          onCheckedChange?.(checked)
        }}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
    </Field>
  )
}
