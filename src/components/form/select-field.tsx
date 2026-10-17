import { useId } from 'react'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useFieldContext } from '#/lib/forms/form-context'
import { cn } from '#/lib/utils'

type SelectOption = { value: string; label: string; group?: string }

type SelectFieldProps = {
  label: string
  hideLabel?: boolean
  placeholder: string
  options: ReadonlyArray<SelectOption>
  clearLabel?: string
  beforeChange?: (value: string) => boolean
}

export function SelectField({
  label,
  hideLabel,
  placeholder,
  options,
  clearLabel,
  beforeChange,
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  const current = field.state.value
  const ungrouped = options.filter((option) => !option.group)
  const groups = [...new Set(options.flatMap((option) => option.group ?? []))]
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className={cn(hideLabel && 'sr-only')}>
        {label}
      </FieldLabel>
      <Select
        name={field.name}
        items={options}
        value={current || null}
        onValueChange={(value) => {
          if (value && beforeChange && !beforeChange(value)) return
          field.handleChange(value ?? '')
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={invalid}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {clearLabel && current && (
            <SelectItem value={null}>{clearLabel}</SelectItem>
          )}
          {ungrouped.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          {groups.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {options
                .filter((option) => option.group === group)
                .map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
