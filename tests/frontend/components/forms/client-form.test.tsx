import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/test-utils';
import { ComponentTestHelpers, FormTestUtils, MockAPIResponses } from '../../utils/test-utils';
import { mockApiResponse } from '../../../frontend-setup';

// Mock the form component by creating a simplified version
const ClientForm = ({ client, onSuccess }: { client?: any; onSuccess: () => void }) => {
  const [formData, setFormData] = React.useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    status: client?.status || 'lead',
    notes: client?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name) {
      return;
    }

    try {
      const response = await fetch(client ? `/api/clients/${client.id}` : '/api/clients', {
        method: client ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} data-testid="client-form">
      <div>
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          data-testid="client-name-input"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          data-testid="client-email-input"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          data-testid="client-phone-input"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="address">Address</label>
        <textarea
          id="address"
          data-testid="client-address-input"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          data-testid="client-status-select"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="lead">Lead</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="client">Client</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          data-testid="client-notes-input"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
        />
      </div>

      <button type="submit" data-testid="client-form-submit">
        {client ? 'Update Client' : 'Create Client'}
      </button>

      <button type="button" data-testid="client-form-cancel">
        Cancel
      </button>
    </form>
  );
};

describe('Client Form Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should render empty form for creating new client', () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    expect(screen.getByTestId('client-form')).toBeInTheDocument();
    expect(screen.getByTestId('client-name-input')).toHaveValue('');
    expect(screen.getByTestId('client-email-input')).toHaveValue('');
    expect(screen.getByTestId('client-phone-input')).toHaveValue('');
    expect(screen.getByTestId('client-address-input')).toHaveValue('');
    expect(screen.getByTestId('client-status-select')).toHaveValue('lead');
    expect(screen.getByTestId('client-notes-input')).toHaveValue('');
  });

  it('should render form with client data for editing', () => {
    const mockClient = {
      ...MockAPIResponses.clients.getById('test-id'),
      name: 'Existing Client',
      email: 'existing@client.com',
      phone: '+1234567890',
      address: '123 Main St',
      status: 'qualified',
      notes: 'Existing notes'
    };

    render(<ClientForm client={mockClient} onSuccess={mockOnSuccess} />);

    expect(screen.getByTestId('client-name-input')).toHaveValue('Existing Client');
    expect(screen.getByTestId('client-email-input')).toHaveValue('existing@client.com');
    expect(screen.getByTestId('client-phone-input')).toHaveValue('+1234567890');
    expect(screen.getByTestId('client-address-input')).toHaveValue('123 Main St');
    expect(screen.getByTestId('client-status-select')).toHaveValue('qualified');
    expect(screen.getByTestId('client-notes-input')).toHaveValue('Existing notes');
  });

  it('should update form fields when user types', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const nameInput = screen.getByTestId('client-name-input');
    const emailInput = screen.getByTestId('client-email-input');

    await FormTestUtils.fillInput(nameInput, 'New Client Name');
    await FormTestUtils.fillInput(emailInput, 'new@client.com');

    expect(nameInput).toHaveValue('New Client Name');
    expect(emailInput).toHaveValue('new@client.com');
  });

  it('should handle status selection', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const statusSelect = screen.getByTestId('client-status-select');
    const user = await ComponentTestHelpers.userEvent();

    await user.selectOptions(statusSelect, 'qualified');
    expect(statusSelect).toHaveValue('qualified');

    await user.selectOptions(statusSelect, 'client');
    expect(statusSelect).toHaveValue('client');
  });

  it('should submit form with valid data for new client', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.clients.create({
        name: 'Test Client',
        email: 'test@client.com'
      }))
    );

    render(<ClientForm onSuccess={mockOnSuccess} />);

    const nameInput = screen.getByTestId('client-name-input');
    const emailInput = screen.getByTestId('client-email-input');
    const submitButton = screen.getByTestId('client-form-submit');

    await FormTestUtils.fillInput(nameInput, 'Test Client');
    await FormTestUtils.fillInput(emailInput, 'test@client.com');

    const user = await ComponentTestHelpers.userEvent();
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Client',
          email: 'test@client.com',
          phone: '',
          address: '',
          status: 'lead',
          notes: ''
        })
      });
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it('should submit form with valid data for updating existing client', async () => {
    const mockClient = {
      id: 'existing-client-id',
      name: 'Existing Client',
      email: 'existing@client.com',
      status: 'lead'
    };

    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse(MockAPIResponses.clients.update('existing-client-id', {
        name: 'Updated Client'
      }))
    );

    render(<ClientForm client={mockClient} onSuccess={mockOnSuccess} />);

    const nameInput = screen.getByTestId('client-name-input');
    const submitButton = screen.getByTestId('client-form-submit');

    await FormTestUtils.fillInput(nameInput, 'Updated Client');

    const user = await ComponentTestHelpers.userEvent();
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/clients/existing-client-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Updated Client')
      });
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it('should not submit form when required name field is empty', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByTestId('client-form-submit');
    const user = await ComponentTestHelpers.userEvent();

    await user.click(submitButton);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByTestId('client-email-input');
    const nameInput = screen.getByTestId('client-name-input');

    await FormTestUtils.fillInput(nameInput, 'Test Client');
    await FormTestUtils.fillInput(emailInput, 'invalid-email');

    // HTML5 validation should prevent submission
    const form = screen.getByTestId('client-form');
    const user = await ComponentTestHelpers.userEvent();

    // Try to submit with invalid email
    await user.click(screen.getByTestId('client-form-submit'));

    // Browser validation should prevent the fetch call
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle form submission errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<ClientForm onSuccess={mockOnSuccess} />);

    const nameInput = screen.getByTestId('client-name-input');
    const submitButton = screen.getByTestId('client-form-submit');

    await FormTestUtils.fillInput(nameInput, 'Test Client');

    const user = await ComponentTestHelpers.userEvent();
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // onSuccess should not be called on error
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should handle all client status options', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const statusSelect = screen.getByTestId('client-status-select');
    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(5);
    expect(options[0]).toHaveValue('lead');
    expect(options[1]).toHaveValue('qualified');
    expect(options[2]).toHaveValue('proposal');
    expect(options[3]).toHaveValue('client');
    expect(options[4]).toHaveValue('inactive');
  });

  it('should show correct button text for create vs update', () => {
    const { rerender } = render(<ClientForm onSuccess={mockOnSuccess} />);

    expect(screen.getByTestId('client-form-submit')).toHaveTextContent('Create Client');

    const mockClient = { id: 'test-id', name: 'Test Client' };
    rerender(<ClientForm client={mockClient} onSuccess={mockOnSuccess} />);

    expect(screen.getByTestId('client-form-submit')).toHaveTextContent('Update Client');
  });

  it('should handle textarea inputs correctly', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const addressInput = screen.getByTestId('client-address-input');
    const notesInput = screen.getByTestId('client-notes-input');

    await FormTestUtils.fillInput(addressInput, '123 Main Street\nSuite 100\nAnytown, ST 12345');
    await FormTestUtils.fillInput(notesInput, 'Important client\nHigh value prospect');

    expect(addressInput).toHaveValue('123 Main Street\nSuite 100\nAnytown, ST 12345');
    expect(notesInput).toHaveValue('Important client\nHigh value prospect');
  });

  it('should be accessible with proper labels', () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('should handle cancel button click', async () => {
    render(<ClientForm onSuccess={mockOnSuccess} />);

    const cancelButton = screen.getByTestId('client-form-cancel');
    const user = await ComponentTestHelpers.userEvent();

    await user.click(cancelButton);

    // Cancel button should not submit form
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});