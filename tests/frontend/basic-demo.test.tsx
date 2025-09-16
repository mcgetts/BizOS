import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from './utils/test-utils';
import { ComponentTestHelpers } from './utils/test-utils';

// Simple demo component to showcase testing capabilities
const DemoComponent = ({ title, onClick }: { title: string; onClick?: () => void }) => {
  const [count, setCount] = React.useState(0);

  return (
    <div data-testid="demo-component">
      <h1 data-testid="demo-title">{title}</h1>
      <p data-testid="demo-count">Count: {count}</p>
      <button
        data-testid="demo-increment"
        onClick={() => setCount(c => c + 1)}
      >
        Increment
      </button>
      {onClick && (
        <button data-testid="demo-callback" onClick={onClick}>
          Callback
        </button>
      )}
    </div>
  );
};

describe('Frontend Testing Demo', () => {
  it('should render demo component', () => {
    render(<DemoComponent title="Test Title" />);

    expect(screen.getByTestId('demo-component')).toBeInTheDocument();
    expect(screen.getByTestId('demo-title')).toHaveTextContent('Test Title');
    expect(screen.getByTestId('demo-count')).toHaveTextContent('Count: 0');
  });

  it('should handle state updates', async () => {
    render(<DemoComponent title="Counter Test" />);

    const incrementButton = screen.getByTestId('demo-increment');
    const countDisplay = screen.getByTestId('demo-count');

    expect(countDisplay).toHaveTextContent('Count: 0');

    const user = await ComponentTestHelpers.userEvent();
    await user.click(incrementButton);

    expect(countDisplay).toHaveTextContent('Count: 1');

    await user.click(incrementButton);
    expect(countDisplay).toHaveTextContent('Count: 2');
  });

  it('should handle callback props', async () => {
    const mockCallback = vi.fn();
    render(<DemoComponent title="Callback Test" onClick={mockCallback} />);

    const callbackButton = screen.getByTestId('demo-callback');
    const user = await ComponentTestHelpers.userEvent();

    await user.click(callbackButton);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    await user.click(callbackButton);
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('should handle conditional rendering', () => {
    const { rerender } = render(<DemoComponent title="Conditional Test" />);

    expect(screen.queryByTestId('demo-callback')).not.toBeInTheDocument();

    rerender(<DemoComponent title="Conditional Test" onClick={() => {}} />);

    expect(screen.getByTestId('demo-callback')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<DemoComponent title="Accessibility Test" />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Accessibility Test');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Increment');
  });
});