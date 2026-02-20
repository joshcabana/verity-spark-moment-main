import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import MatchDecision from '../MatchDecision';
import { useAuth } from '@/hooks/useAuth';
import { readMatchSession, clearMatchSession } from '@/lib/match-session';
import { supabase } from '@/integrations/supabase/client';

// Mock routing & Auth
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock Match storage library
vi.mock('@/lib/match-session', () => ({
  readMatchSession: vi.fn(),
  clearMatchSession: vi.fn(),
}));

// Mock Supabase channel RPC calls
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }
}));

describe('MatchDecision Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user-id' }
    });
  });

  it('redirects to lobby if session is missing', () => {
    (readMatchSession as ReturnType<typeof vi.fn>).mockReturnValue(null);

    render(
      <MemoryRouter>
        <MatchDecision />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
  });

  it('renders correctly with match session state', () => {
    (readMatchSession as ReturnType<typeof vi.fn>).mockReturnValue({
      matchedWith: 'target-id',
      matchId: 'match-123'
    });

    render(
      <MemoryRouter>
        <MatchDecision />
      </MemoryRouter>
    );

    expect(screen.getByText(/Did you feel a spark/i)).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('Spark!')).toBeInTheDocument();
  });

  it('calls decline RPC and routes back to lobby when "Pass" is tapped', async () => {
    const user = userEvent.setup();
    (readMatchSession as ReturnType<typeof vi.fn>).mockReturnValue({
      matchedWith: 'target-id',
      matchId: 'match-123'
    });

    // Mock successful RPC execution
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });

    render(
      <MemoryRouter>
        <MatchDecision />
      </MemoryRouter>
    );

    const passButton = screen.getByText('Pass');
    await user.click(passButton);

    expect(supabase.rpc).toHaveBeenCalledWith('rpc_submit_match_decision', {
      p_match_id: 'match-123',
      p_decision: 'pass',
      p_note: null
    });

    // We expect it to redirect quickly on decline to spare ego
    expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    expect(clearMatchSession).toHaveBeenCalled();
  });
});
