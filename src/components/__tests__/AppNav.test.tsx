import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppNav from '../AppNav';

describe('AppNav Component', () => {
  it('renders standard navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppNav />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Go Live')).toBeInTheDocument();
    expect(screen.getByText('Sparks')).toBeInTheDocument();
    expect(screen.getByText('Tokens')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('hides navigation when on call screen (/call)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/call']}>
        <AppNav />
      </MemoryRouter>
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('hides navigation when on match screen (/match)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/match']}>
        <AppNav />
      </MemoryRouter>
    );
    
    expect(container.firstChild).toBeNull();
  });
});
