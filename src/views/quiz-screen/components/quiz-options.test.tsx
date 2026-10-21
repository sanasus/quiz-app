import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../app/i18n'
import { QuizOptions } from './quiz-options'

const options = [
  { id: 'a', text: 'Paris' },
  { id: 'b', text: 'London' },
  { id: 'c', text: 'Berlin' },
]

function renderOptions(
  props: Partial<React.ComponentProps<typeof QuizOptions>> = {},
) {
  const onSelect = vi.fn()
  render(
    <I18nextProvider i18n={i18n}>
      <QuizOptions
        options={options}
        correctOptionIds={['a']}
        selectedIds={[]}
        status="playing"
        onSelect={onSelect}
        {...props}
      />
    </I18nextProvider>,
  )
  return { onSelect }
}

describe('QuizOptions', () => {
  it('labels the options A, B, C and reports the clicked id', async () => {
    const { onSelect } = renderOptions()

    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByText('B')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('option-b'))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('marks the pick as selected while the question is open', () => {
    renderOptions({ selectedIds: ['c'] })

    expect(screen.getByTestId('option-c')).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('option-a')).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByTestId('option-c')).not.toHaveAttribute('data-state')
  })

  it('reveals the right answer and the wrong pick once answered', () => {
    renderOptions({ status: 'answered', selectedIds: ['b'] })

    expect(screen.getByTestId('option-a')).toHaveAttribute(
      'data-state',
      'correct',
    )
    expect(screen.getByTestId('option-b')).toHaveAttribute(
      'data-state',
      'incorrect',
    )
    expect(screen.getByTestId('option-c')).not.toHaveAttribute('data-state')
  })

  it('freezes the options after the answer', async () => {
    const { onSelect } = renderOptions({
      status: 'answered',
      selectedIds: ['a'],
    })

    for (const option of screen.getAllByRole('option')) {
      expect(option).toBeDisabled()
    }
    await userEvent.click(screen.getByTestId('option-c'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows a correct pick as correct without an incorrect one', () => {
    renderOptions({ status: 'answered', selectedIds: ['a'] })

    expect(screen.getByTestId('option-a')).toHaveAttribute(
      'data-state',
      'correct',
    )
    expect(
      screen
        .getAllByRole('option')
        .filter((o) => o.getAttribute('data-state') === 'incorrect'),
    ).toHaveLength(0)
  })
})
