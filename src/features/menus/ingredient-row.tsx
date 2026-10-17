import type { ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import type { IngredientParent } from '#/lib/schemas/ingredient'
import type { Tables } from '#/lib/supabase/database.types'
import { IngredientList } from './ingredient-list'
import { InlineNameField } from './inline-name-fields'

type NameWithIngredientsProps = {
  menuId: string
  parent: IngredientParent
  ingredients: Tables<'ingredients'>[]
  name: string
  label: string
  handle: ReactNode
  onSave: (name: string) => Promise<unknown>
  onDelete: () => void
}

export function NameWithIngredients({
  menuId,
  parent,
  ingredients,
  name,
  label,
  handle,
  onSave,
  onDelete,
}: NameWithIngredientsProps) {
  return (
    <Collapsible>
      <InlineNameField
        handle={handle}
        name={name}
        label={label}
        onSave={onSave}
        onDelete={onDelete}
        actions={
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                className="gap-1 px-2 text-muted-foreground"
              />
            }
          >
            <span className="text-xs tabular-nums">{ingredients.length}</span>
            <ChevronDownIcon className="transition-transform group-data-[panel-open]/button:rotate-180" />
            <span className="sr-only">
              Ingredients for {name} ({ingredients.length})
            </span>
          </CollapsibleTrigger>
        }
      />
      <CollapsibleContent className="pt-2 pb-3 pl-9">
        <IngredientList
          menuId={menuId}
          parent={parent}
          parentName={name}
          ingredients={ingredients}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
