import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  // ============================================================================
  // RENDERING TESTS
  // ============================================================================

  describe('rendering', () => {
    it('renders with correct title', () => {
      render(
        <CollapsibleSection title="Test Title">
          <div>Content</div>
        </CollapsibleSection>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test title/i })).toBeInTheDocument();
    });

    it('renders children when expanded', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={true}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('hides children when collapsed', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      // Content should not be visible when collapsed
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('renders chevron icon', () => {
      render(
        <CollapsibleSection title="Test Title">
          <div>Content</div>
        </CollapsibleSection>
      );

      // Chevron should be present (hidden for accessibility)
      const chevron = document.querySelector('[aria-hidden="true"]');
      expect(chevron).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CollapsibleSection title="Test Title" className="custom-class">
          <div>Content</div>
        </CollapsibleSection>
      );

      const collapsible = container.firstChild;
      expect(collapsible).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // DEFAULT STATE TESTS
  // ============================================================================

  describe('default state', () => {
    it('starts expanded when defaultOpen is true', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={true}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('starts collapsed when defaultOpen is false', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('starts collapsed when defaultOpen is undefined', () => {
      render(
        <CollapsibleSection title="Test Title">
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('interaction', () => {
    it('toggles open/closed on header click', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });

      // Initially collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();

      // Click to expand
      await user.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });

      // Click to collapse
      await user.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
      });
    });

    it('toggles with Enter key', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });

      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Press Enter to expand
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });

      // Press Enter to collapse
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('toggles with Space key', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });

      // Focus the button
      button.focus();

      // Press Space to expand
      await user.keyboard(' ');

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });

      // Press Space to collapse
      await user.keyboard(' ');

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('can be toggled multiple times', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });

      // Toggle open
      await user.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });

      // Toggle closed
      await user.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });

      // Toggle open again
      await user.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });

      // Toggle closed again
      await user.click(button);
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  // ============================================================================
  // INFO TOOLTIP TESTS
  // ============================================================================

  describe('info tooltip', () => {
    it('shows tooltip when infoTooltip prop is provided', () => {
      render(
        <CollapsibleSection title="Test Title" infoTooltip="This is helpful information">
          <div>Content</div>
        </CollapsibleSection>
      );

      const infoButton = screen.getByRole('button', { name: /about test title/i });
      expect(infoButton).toBeInTheDocument();
    });

    it('does not show tooltip when infoTooltip is undefined', () => {
      render(
        <CollapsibleSection title="Test Title">
          <div>Content</div>
        </CollapsibleSection>
      );

      const infoButton = screen.queryByRole('button', { name: /about test title/i });
      expect(infoButton).not.toBeInTheDocument();
    });

    it('shows tooltip content on hover', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" infoTooltip="This is helpful information">
          <div>Content</div>
        </CollapsibleSection>
      );

      const infoButton = screen.getByRole('button', { name: /about test title/i });

      // Hover over the info button
      await user.hover(infoButton);

      // Wait for tooltip to appear (use getAllByText since tooltip is duplicated for accessibility)
      await waitFor(
        () => {
          const tooltips = screen.getAllByText('This is helpful information');
          expect(tooltips.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );
    });

    it('does not toggle section when clicking info icon', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false} infoTooltip="Info text">
          <div>Test Content</div>
        </CollapsibleSection>
      );

      const infoButton = screen.getByRole('button', { name: /about test title/i });

      // Get all buttons and find the trigger (the one that's NOT the info button)
      const allButtons = screen.getAllByRole('button');
      const trigger = allButtons.find(
        (btn) => btn !== infoButton && btn.textContent?.includes('Test Title')
      );

      expect(trigger).toBeDefined();

      // Initially collapsed
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      // Click info button
      await user.click(infoButton);

      // Should still be collapsed (not toggled)
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('info icon has proper aria-label', () => {
      render(
        <CollapsibleSection title="My Section" infoTooltip="Info text">
          <div>Content</div>
        </CollapsibleSection>
      );

      const infoButton = screen.getByRole('button', { name: /about my section/i });
      expect(infoButton).toHaveAttribute('aria-label', 'About my section');
    });
  });

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('accessibility', () => {
    it('header has aria-expanded attribute', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('aria-expanded changes when toggled', async () => {
      const user = userEvent.setup();

      render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });

      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('can be navigated with keyboard (Tab)', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <CollapsibleSection title="Test Title">
            <div>Content</div>
          </CollapsibleSection>
          <button>After</button>
        </div>
      );

      const beforeButton = screen.getByRole('button', { name: 'Before' });
      const trigger = screen.getByRole('button', { name: /test title/i });
      const afterButton = screen.getByRole('button', { name: 'After' });

      // Focus first button
      beforeButton.focus();
      expect(beforeButton).toHaveFocus();

      // Tab to trigger
      await user.tab();
      expect(trigger).toHaveFocus();

      // Tab to after button
      await user.tab();
      expect(afterButton).toHaveFocus();
    });

    it('can be navigated with keyboard when info tooltip is present', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>Before</button>
          <CollapsibleSection title="Test Title" infoTooltip="Info text">
            <div>Content</div>
          </CollapsibleSection>
          <button>After</button>
        </div>
      );

      const beforeButton = screen.getByRole('button', { name: 'Before' });
      const afterButton = screen.getByRole('button', { name: 'After' });

      // Get all buttons to find trigger and info button
      const allButtons = screen.getAllByRole('button');
      const infoButton = screen.getByRole('button', { name: /about test title/i });
      const trigger = allButtons.find(
        (btn) =>
          btn !== beforeButton &&
          btn !== afterButton &&
          btn !== infoButton &&
          btn.textContent?.includes('Test Title')
      );

      expect(trigger).toBeDefined();

      // Focus first button
      beforeButton.focus();

      // Tab to trigger
      await user.tab();
      expect(trigger).toHaveFocus();

      // Tab to info button
      await user.tab();
      expect(infoButton).toHaveFocus();

      // Tab to after button
      await user.tab();
      expect(afterButton).toHaveFocus();
    });

    it('chevron has aria-hidden attribute', () => {
      const { container } = render(
        <CollapsibleSection title="Test Title">
          <div>Content</div>
        </CollapsibleSection>
      );

      const chevron = container.querySelector('svg[aria-hidden="true"]');
      expect(chevron).toBeInTheDocument();
    });

    it('info icon has aria-hidden on svg element', () => {
      const { container } = render(
        <CollapsibleSection title="Test Title" infoTooltip="Info text">
          <div>Content</div>
        </CollapsibleSection>
      );

      // The Info icon should have aria-hidden
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('handles long title text without breaking layout', () => {
      const longTitle =
        'This is a very long title that should not break the layout even when it contains many characters and wraps to multiple lines';

      render(
        <CollapsibleSection title={longTitle}>
          <div>Content</div>
        </CollapsibleSection>
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
      const button = screen.getByRole('button', { name: new RegExp(longTitle, 'i') });
      expect(button).toBeInTheDocument();
    });

    it('handles empty children', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={true}>
          {null}
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('handles complex children', () => {
      render(
        <CollapsibleSection title="Test Title" defaultOpen={true}>
          <div>
            <h4>Nested heading</h4>
            <p>Paragraph text</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CollapsibleSection>
      );

      expect(screen.getByText('Nested heading')).toBeInTheDocument();
      expect(screen.getByText('Paragraph text')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('maintains state when re-rendered with same defaultOpen', () => {
      const { rerender } = render(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Content</div>
        </CollapsibleSection>
      );

      const button = screen.getByRole('button', { name: /test title/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Re-render with same props
      rerender(
        <CollapsibleSection title="Test Title" defaultOpen={false}>
          <div>Content Updated</div>
        </CollapsibleSection>
      );

      // Should still be collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('handles title with special characters', () => {
      const specialTitle = 'Test & Title <with> \'quotes\' and "symbols"';

      render(
        <CollapsibleSection title={specialTitle}>
          <div>Content</div>
        </CollapsibleSection>
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('handles multiple instances independently', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <CollapsibleSection title="Section 1" defaultOpen={false}>
            <div>Content 1</div>
          </CollapsibleSection>
          <CollapsibleSection title="Section 2" defaultOpen={false}>
            <div>Content 2</div>
          </CollapsibleSection>
        </div>
      );

      const button1 = screen.getByRole('button', { name: /section 1/i });
      const button2 = screen.getByRole('button', { name: /section 2/i });

      // Both collapsed initially
      expect(button1).toHaveAttribute('aria-expanded', 'false');
      expect(button2).toHaveAttribute('aria-expanded', 'false');

      // Expand first section
      await user.click(button1);

      await waitFor(() => {
        expect(button1).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Content 1')).toBeInTheDocument();
      });

      // Second section should still be collapsed
      expect(button2).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      // Expand second section
      await user.click(button2);

      await waitFor(() => {
        expect(button2).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Content 2')).toBeInTheDocument();
      });

      // First section should still be expanded
      expect(button1).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });
});
