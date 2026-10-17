import { menuFormOptions } from '#/lib/forms/menu'
import { withFieldGroup } from '#/lib/forms/use-app-form'

export const NameDescriptionFields = withFieldGroup({
  defaultValues: menuFormOptions.defaultValues,
  props: { descriptionRows: 3 },
  render: function Render({ group, descriptionRows }) {
    return (
      <>
        <group.AppField name="name">
          {(field) => <field.TextField label="Name" autoFocus />}
        </group.AppField>
        <group.AppField name="description">
          {(field) => (
            <field.TextareaField
              label="Description (optional)"
              rows={descriptionRows}
            />
          )}
        </group.AppField>
      </>
    )
  },
})
