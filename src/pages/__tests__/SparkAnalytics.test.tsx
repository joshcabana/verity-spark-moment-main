import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SparkAnalytics from '../SparkAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('SparkAnalytics Page', () => {
  beforeEach(() => {
    // Default mock that handles the .or() chain to prevent unhandled rejections
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('shows paywall when user is not subscribed', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      subscribed: false,
    });

    render(
      <MemoryRouter>
        <SparkAnalytics />
      </MemoryRouter>
    );

    expect(screen.getByText('Unlock Spark Analytics')).toBeInTheDocument();
    expect(screen.getByText('Get Verity Pass')).toBeInTheDocument();
  });

  it('shows analytics dashboard when user is subscribed', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      subscribed: true,
    });

    const mockMatches = [
      {
        id: 'm1',
        user1_id: 'test-user',
        user2_id: 'other-1',
        user1_decision: 'spark',
        user2_decision: 'spark',
        is_mutual: true,
        room_id: 'general',
        created_at: new Date().toISOString(),
      },
      {
        id: 'm2',
        user1_id: 'test-user',
        user2_id: 'other-2',
        user1_decision: 'spark',
        user2_decision: 'pass',
        is_mutual: false,
        room_id: 'tech',
        created_at: new Date().toISOString(),
      },
    ];

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockMatches, error: null }),
    });

    render(
      <MemoryRouter>
        <SparkAnalytics />
      </MemoryRouter>
    );

    expect(await screen.findByText('Spark Analytics')).toBeInTheDocument();
    expect(await screen.findByText('Total Calls')).toBeInTheDocument();
    expect(await screen.findByText('Mutual Sparks')).toBeInTheDocument();
    expect(await screen.findByText('Spark Rate')).toBeInTheDocument();
    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(await screen.findByText('Spark Breakdown')).toBeInTheDocument();
    expect(await screen.findByText('Last 7 Days')).toBeInTheDocument();
    expect(await screen.findByText('Room Insights')).toBeInTheDocument();
  });

  it('shows empty state for subscribers with no matches', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'test-user' },
      subscribed: true,
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    render(
      <MemoryRouter>
        <SparkAnalytics />
      </MemoryRouter>
    );

    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(await screen.findByText('No room data yet. Go Live to start!')).toBeInTheDocument();
  });
});
