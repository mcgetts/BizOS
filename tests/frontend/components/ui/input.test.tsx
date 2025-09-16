import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { ComponentTestHelpers, FormTestUtils } from '../../utils/test-utils';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render input with default props', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md');
  });

  it('should render with placeholder text', () => {
    render(<Input placeholder="Enter your name" />);

    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
  });

  it('should handle text input correctly', async () => {
    render(<Input data-testid="test-input" />);

    const input = screen.getByTestId('test-input');
    await FormTestUtils.fillInput(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('should handle different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="email-input" />);
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" data-testid="password-input" />);
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" data-testid="number-input" />);
    expect(screen.getByTestId('number-input')).toHaveAttribute('type', 'number');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('should handle focus and blur events', async () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

    const user = await ComponentTestHelpers.userEvent();
    const input = screen.getByRole('textbox');

    await user.click(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should handle change events', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const user = await ComponentTestHelpers.userEvent();
    const input = screen.getByRole('textbox');

    await user.type(input, 'test');
    expect(handleChange).toHaveBeenCalledTimes(4); // Called for each character
  });

  it('should accept custom className', () => {
    render(<Input className="custom-input-class" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input-class');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should have proper focus styles', () => {
    render(<Input />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2'
    );
  });

  it('should handle required attribute', () => {
    render(<Input required />);

    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('should handle readonly attribute', () => {
    render(<Input readOnly value="readonly value" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('readonly value');
  });

  it('should handle name and id attributes', () => {
    render(<Input name="username" id="username-input" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'username');
    expect(input).toHaveAttribute('id', 'username-input');
  });

  it('should handle maxLength attribute', async () => {
    render(<Input maxLength={5} />);

    const user = await ComponentTestHelpers.userEvent();
    const input = screen.getByRole('textbox');

    await user.type(input, 'this is a long text');
    expect(input).toHaveValue('this '); // Should be truncated to 5 characters
  });

  it('should handle form validation attributes', () => {
    render(
      <Input
        type="email"
        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
        title="Please enter a valid email address"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('pattern', '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$');
    expect(input).toHaveAttribute('title', 'Please enter a valid email address');
  });

  it('should handle file input type', () => {
    render(<Input type="file" accept=".jpg,.png" data-testid="file-input" />);

    const input = screen.getByTestId('file-input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.jpg,.png');
  });

  it('should handle controlled input', async () => {
    const ControlledInput = () => {
      const [value, setValue] = React.useState('initial');
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="controlled-input"
        />
      );
    };

    render(<ControlledInput />);

    const input = screen.getByTestId('controlled-input');
    expect(input).toHaveValue('initial');

    await FormTestUtils.fillInput(input, 'updated');
    expect(input).toHaveValue('updated');
  });

  it('should handle keyboard navigation', async () => {
    render(
      <div>
        <Input data-testid="input1" />
        <Input data-testid="input2" />
      </div>
    );

    const user = await ComponentTestHelpers.userEvent();
    const input1 = screen.getByTestId('input1');
    const input2 = screen.getByTestId('input2');

    input1.focus();
    expect(input1).toHaveFocus();

    await user.tab();
    expect(input2).toHaveFocus();

    await user.tab({ shift: true });
    expect(input1).toHaveFocus();
  });

  it('should combine all styling classes correctly', () => {
    render(<Input className="custom-class" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-base',
      'ring-offset-background',
      'custom-class'
    );
  });
});