import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TokenShop from '../TokenShop';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('TokenShop Component', () => {
  it('renders token balance correctly', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      tokens: { balance: 42 },
      subscribed: false,
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: { balance: 42, free_entries_remaining: 3 }, 
        error: null 
      })
    });

    render(
      <MemoryRouter>
        <TokenShop />
      </MemoryRouter>
    );

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('tokens available')).toBeInTheDocument();
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
