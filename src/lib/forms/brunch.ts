import { formOptions } from '@tanstack/react-form'
import { brunchSchema, type BrunchInput } from '#/lib/schemas/brunch'

const brunchDefaults: BrunchInput = {
  title: '',
  menuId: '',
  scheduling: 'fixed',
  startsAt: '',
  slots: [],
  responsesCloseAt: '',
  location: '',
  description: '',
  inviteOnly: false,
  requireItems: false,
}

export const brunchFormOptions = formOptions({
  defaultValues: brunchDefaults,
  validators: { onChange: brunchSchema },
})
