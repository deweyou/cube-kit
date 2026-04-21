import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { EventSelector } from './event-selector'

afterEach(cleanup)

describe('EventSelector', () => {
  it('renders the current event label', () => {
    render(<EventSelector value="333" onChange={vi.fn()} />)
    expect(screen.getByText('3×3×3')).toBeTruthy()
  })

  it('calls onChange with event id when a new event is selected', async () => {
    const onChange = vi.fn()
    render(<EventSelector value="333" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), '222')
    expect(onChange).toHaveBeenCalledWith('222')
  })
})
