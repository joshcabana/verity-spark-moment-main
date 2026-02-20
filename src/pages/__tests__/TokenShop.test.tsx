import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TokenShop from '../TokenShop';
import { useAuth } from '@/hooks/useAuth';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('TokenShop Component', () => {
  it('renders token balance correctly', () => {
    (useAuth as any).mockReturnValue({
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
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 10 },
      subscribed: true,
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(screen.getByText('Active Pass')).toBeInTheDocument();
  });

  it('displays Verity Pass purchase option when not subscribed', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 10 },
      subscribed: false,
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(screen.getByText('Get Verity Pass')).toBeInTheDocument();
  });
});
