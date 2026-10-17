import { useId } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { formatDay } from '#/lib/date'
import { useFieldContext } from '#/lib/forms/form-context'

const DEFAULT_HOUR = 10

const pad = (n: number) => String(n).padStart(2, '0')

type DateTimeFieldProps = { label: string }

export function DateTimeField({ label }: DateTimeFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  const current = field.state.value ? new Date(field.state.value) : undefined
  const time = current
    ? `${pad(current.getHours())}:${pad(current.getMinutes())}`
    : ''

  const pickDate = (day: Date | undefined) => {
    if (!day) return
    const next = new Date(day)
    next.setHours(
      current?.getHours() ?? DEFAULT_HOUR,
      current?.getMinutes() ?? 0,
      0,
      0,
    )
    field.handleChange(next.toISOString())
  }

  const pickTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    if (Number.isNaN(hours) || Number.isNaN(minutes) || !current) return
    const next = new Date(current)
    next.setHours(hours, minutes, 0, 0)
    field.handleChange(next.toISOString())
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                id={id}
                type="button"
                variant="outline"
                className="min-w-0 flex-1 justify-start font-normal"
                aria-invalid={invalid}
                onBlur={field.handleBlur}
              />
            }
          >
            <CalendarIcon />
            <span className="truncate">
              {current ? formatDay(current) : 'Pick a date'}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={current}
              defaultMonth={current}
              onSelect={pickDate}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          aria-label={`${label} time`}
          className="w-28 shrink-0"
          disabled={!current}
          value={time}
          onChange={(event) => {
            pickTime(event.target.value)
          }}
        />
      </div>
      {invalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
