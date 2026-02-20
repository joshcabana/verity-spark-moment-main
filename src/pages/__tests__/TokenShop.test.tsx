import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TokenShop from '../TokenShop';
import { useAuth } from '@/hooks/useAuth';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('TokenShop Component', () => {
  it('renders token balance correctly', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 42 },
      subscribed: false,
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Verity Tokens')).toBeInTheDocument();
  });

  it('displays Verity Pass as active when subscribed', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 10 },
      subscribed: true,
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
  });

  it('displays Verity Pass purchase option when not subscribed', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 10 },
      subscribed: false,
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(screen.getByText('Subscribe to Verity Pass')).toBeInTheDocument();
  });
});
