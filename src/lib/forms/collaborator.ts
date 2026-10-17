import { formOptions } from '@tanstack/react-form'
import {
  addMenuCollaboratorSchema,
  type AddMenuCollaboratorInput,
} from '#/lib/schemas/collaborator'

const addMenuCollaboratorDefaults: AddMenuCollaboratorInput = {
  email: '',
  role: 'viewer',
}

export const addMenuCollaboratorFormOptions = formOptions({
  defaultValues: addMenuCollaboratorDefaults,
  validators: { onChange: addMenuCollaboratorSchema },
})
