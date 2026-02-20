import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from '../ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test rendering crash');
};

describe('ErrorBoundary Component', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="safe-child">Safe Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });

  it('catches rendering errors and displays a fallback UI', () => {
    // Suppress console.error solely for the expected crash boundary
    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    expect(screen.getByText('Return Home')).toBeInTheDocument();

    spy.mockRestore();
  });
});
