import { formOptions } from '@tanstack/react-form'
import { menuSchema, type MenuInput } from '#/lib/schemas/menu'

const menuDefaults: MenuInput = { name: '', description: '' }

// Items share the menu's name + description shape, so one form serves both.
export const menuFormOptions = formOptions({
  defaultValues: menuDefaults,
  validators: { onChange: menuSchema },
})
