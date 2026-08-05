import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AppTour, { TourStep } from './app-tour';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/components/ui/icons', () => ({
  Icon: () => <div data-testid="mock-icon" />,
}));

const mockSteps: TourStep[] = [
  {
    title: 'Step 1 Title',
    content: 'Step 1 Content',
    icon: '💡',
  },
];

describe('AppTour', () => {
  it('implements correct focus management and accessibility attributes', () => {
    render(<AppTour steps={mockSteps} />);

    // Initially, trigger button is rendered and closed
    const trigger = screen.getByRole('button', { name: 'help' });
    expect(trigger).toBeDefined();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe('tour-modal-container');

    // Click trigger button to open tour
    fireEvent.click(trigger);

    // Dynamic ARIA attributes update
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Onboarding modal is displayed
    const modalContainer = screen.getByRole('dialog');
    expect(modalContainer).toBeDefined();

    // Verify modal inner card container has the correct ID, tabIndex and is focused
    const innerCard = document.getElementById('tour-modal-container');
    expect(innerCard).not.toBeNull();
    expect(innerCard?.getAttribute('tabindex')).toBe('-1');

    // Wait, let's verify focus shifted to innerCard
    expect(document.activeElement).toBe(innerCard);

    // Click Close/Skip button
    const closeBtn = screen.getByRole('button', { name: 'close' });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);

    // Modal is closed
    expect(screen.queryByRole('dialog')).toBeNull();

    // Focus returns to the trigger button
    expect(document.activeElement).toBe(trigger);
  });
});
