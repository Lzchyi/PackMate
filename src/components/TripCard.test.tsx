import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TripCard } from './TripCard';
import { Trip } from '../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('TripCard', () => {
  const mockTrip: Trip = {
    id: '1',
    uid: 'user1',
    name: 'Summer Vacation',
    tripType: 'Leisure',
    transportationType: 'Flight',
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    duration: '10 days',
    items: [
      { id: 'i1', name: 'Passport', category: 'Essentials', isPacked: true },
      { id: 'i2', name: 'Sunscreen', category: 'Toiletries', isPacked: false },
    ],
    createdAt: Date.now(),
  };

  it('renders trip name correctly', () => {
    render(<TripCard trip={mockTrip} onSelectTrip={() => {}} />);
    expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
  });

  it('calculates and displays packing progress correctly', () => {
    render(<TripCard trip={mockTrip} onSelectTrip={() => {}} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('calls onSelectTrip when clicked', () => {
    const onSelectTripMock = vi.fn();
    render(<TripCard trip={mockTrip} onSelectTrip={onSelectTripMock} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(onSelectTripMock).toHaveBeenCalledWith('1');
  });

  it('calls onSelectTrip when Enter key is pressed', () => {
    const onSelectTripMock = vi.fn();
    render(<TripCard trip={mockTrip} onSelectTrip={onSelectTripMock} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    
    expect(onSelectTripMock).toHaveBeenCalledWith('1');
  });
});
