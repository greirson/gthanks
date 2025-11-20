'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { GiftCard } from './hooks/useGiftCardDialogs';
import { Link } from 'lucide-react';

interface AddGiftCardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (card: GiftCard) => void;
  existingCards: GiftCard[];
}

export function AddGiftCardDialog({
  isOpen,
  onOpenChange,
  onAdd,
  existingCards,
}: AddGiftCardDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [amount, setAmount] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus on name input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for the gift card',
        variant: 'destructive',
      });
      return;
    }

    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a URL for the gift card',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      });
      return;
    }

    // Check max cards (10)
    if (existingCards.length >= 10) {
      toast({
        title: 'Maximum cards reached',
        description: 'You can only have up to 10 gift cards per list',
        variant: 'destructive',
      });
      return;
    }

    const newCard: GiftCard = {
      name: name.trim(),
      url: url.trim(),
      amount: amount ? parseFloat(amount) : undefined,
    };

    onAdd(newCard);

    // Reset form
    setName('');
    setUrl('');
    setAmount('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName('');
    setUrl('');
    setAmount('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Add Gift Card
          </DialogTitle>
          <DialogDescription>Add a quick link to a gift card for this list.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                ref={nameInputRef}
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Amazon Gift Card"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.amazon.com/gift-cards"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (optional)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25.00"
              />
            </div>

            {existingCards.length >= 8 && (
              <p className="text-sm text-muted-foreground">
                You have {existingCards.length} of 10 maximum gift cards.
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Gift Card</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
