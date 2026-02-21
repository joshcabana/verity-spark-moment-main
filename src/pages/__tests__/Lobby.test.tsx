import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Lobby from '../Lobby';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const setupMocks = (overrides: { banned?: boolean; phoneVerified?: boolean; balance?: number; freeEntries?: number } = {}) => {
  const { banned = false, phoneVerified = true, balance = 5, freeEntries = 3 } = overrides;

  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: { id: 'test-user' },
    subscribed: false,
  });

  // user_bans query
  const bansMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: banned ? [{ reason: 'test ban', expires_at: null, lifted_at: null }] : [],
      error: null,
    }),
  };

  // profiles query (phone verification)
  const profilesMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { verified_phone: phoneVerified },
      error: null,
    }),
  };

  // user_tokens query
  const tokensMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { free_entries_remaining: freeEntries, balance, free_entries_reset_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    }),
  };

  (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
    if (table === 'user_bans') return bansMock;
    if (table === 'profiles') return profilesMock;
    if (table === 'user_tokens') return tokensMock;
    return bansMock; // fallback
  });
};

describe('Lobby Page', () => {
  it('renders the Go Live heading and button', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Go Live' })).toBeInTheDocument();
    expect(await screen.findByText(/free entries left/)).toBeInTheDocument();
  });

  it('displays all 6 themed rooms', () => {
    setupMocks();

    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>
    );

    expect(screen.getByText('Open Room')).toBeInTheDocument();
    expect(screen.getByText('Night Owls')).toBeInTheDocument();
    expect(screen.getByText('Tech Professionals')).toBeInTheDocument();
    expect(screen.getByText('Creatives & Makers')).toBeInTheDocument();
    expect(screen.getByText('Over 35')).toBeInTheDocument();
    expect(screen.getByText('Introvert Hours')).toBeInTheDocument();
  });

  it('shows warm-up mode toggle', () => {
    setupMocks();

    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>
    );

    expect(screen.getByText('Warm-up Mode')).toBeInTheDocument();
    expect(screen.getByText('First 3 calls are platonic practice rounds')).toBeInTheDocument();
  });

  it('displays free entries and token balance', async () => {
    setupMocks({ freeEntries: 4, balance: 12 });

    render(
      <MemoryRouter>
        <Lobby />
      </MemoryRouter>
    );

    expect(await screen.findByText('4 free entries left')).toBeInTheDocument();
    expect(await screen.findByText(/12 tokens/)).toBeInTheDocument();
  });
});
