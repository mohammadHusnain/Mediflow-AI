import { useState } from 'react'

import { FieldError, FieldLabel, getFieldClass } from '@shared/components/FormPrimitives'
import { getBackendError } from '@shared/lib/records'
import { createExpenseCategory } from '@shared/services/api'

const ADD_NEW_VALUE = '__add_new__'

export default function CategorySelect({
  categories,
  error,
  label = 'Category',
  onCategoryCreated,
  onChange,
  value,
}) {
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const categoryOptions = value && !categories.some((category) => category.name === value)
    ? [{ count: null, name: value }, ...categories]
    : categories

  async function handleAddCategory() {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      setAddError('Category name is required')
      return
    }

    setAdding(true)
    setAddError('')

    try {
      const created = await createExpenseCategory(trimmedName)
      const createdName = created?.name || created?.category || trimmedName
      onCategoryCreated?.(createdName)
      onChange(createdName)
      setNewCategoryName('')
      setShowNewCategoryInput(false)
    } catch (errorResponse) {
      setAddError(getBackendError(errorResponse, 'Category could not be added.'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="animate-fade-up md:col-span-2">
      <FieldLabel error={error} label={label} />
      <select
        className={getFieldClass(error)}
        onChange={(event) => {
          if (event.target.value === ADD_NEW_VALUE) {
            setShowNewCategoryInput(true)
            return
          }

          onChange(event.target.value)
          setAddError('')
          setShowNewCategoryInput(false)
        }}
        value={showNewCategoryInput ? ADD_NEW_VALUE : value}
      >
        <option value="">Select category</option>
        {categoryOptions.map((category) => (
          <option key={category.name} value={category.name}>
            {category.name}
          </option>
        ))}
        <option value={ADD_NEW_VALUE}>+ Add new category...</option>
      </select>
      <FieldError>{error}</FieldError>

      {showNewCategoryInput ? (
        <div className="mt-2 animate-fade-up">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-control border border-hairline bg-canvas px-3 py-2 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
              onChange={(event) => {
                setNewCategoryName(event.target.value)
                setAddError('')
              }}
              placeholder="New category name"
              type="text"
              value={newCategoryName}
            />
            <button
              className="rounded-control bg-brand px-4 py-2 text-[13px] font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
              disabled={adding}
              onClick={handleAddCategory}
              type="button"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
          <FieldError>{addError}</FieldError>
        </div>
      ) : null}
    </div>
  )
}
