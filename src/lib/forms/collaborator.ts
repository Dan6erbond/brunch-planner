import { formOptions } from '@tanstack/react-form'
import {
  addBrunchCollaboratorSchema,
  addMenuCollaboratorSchema,
  type AddBrunchCollaboratorInput,
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

const addBrunchCollaboratorDefaults: AddBrunchCollaboratorInput = {
  email: '',
  role: 'viewer',
}

export const addBrunchCollaboratorFormOptions = formOptions({
  defaultValues: addBrunchCollaboratorDefaults,
  validators: { onChange: addBrunchCollaboratorSchema },
})
