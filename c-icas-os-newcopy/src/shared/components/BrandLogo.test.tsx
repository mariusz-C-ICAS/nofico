import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('renders without crashing', () => {
    render(<BrandLogo />);
  });

  it('contains the correct brand name text', () => {
    render(<BrandLogo />);
    expect(screen.getByText(/C-ICAS/i)).toBeInTheDocument();
    expect(screen.getByText(/\.OS/i)).toBeInTheDocument();
  });

  it('contains the tagline text', () => {
    render(<BrandLogo />);
    expect(screen.getByText(/FieldTime Manage/i)).toBeInTheDocument();
  });
});
