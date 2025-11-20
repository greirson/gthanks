import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { GiftCardSection } from '@/components/lists/GiftCardSection';

interface GiftCard {
  name: string;
  url: string;
}

interface PublicGiftCardSectionProps {
  list: {
    id: string;
    giftCardPreferences?: string | null;
    owner: {
      name: string | null;
    };
  };
}

export function PublicGiftCardSection({ list }: PublicGiftCardSectionProps) {
  // Parse gift cards from API response with error handling
  let giftCards: GiftCard[] = [];
  try {
    if (list.giftCardPreferences) {
      giftCards = JSON.parse(list.giftCardPreferences) as GiftCard[];
    }
  } catch (error) {
    console.error(`Failed to parse gift card preferences for list ${list.id}:`, error);
    // Gracefully degrade - don't show section if parsing fails
  }

  // Don't render if no gift cards
  if (giftCards.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection
      title={`${list.owner.name || 'List Owner'}'s Favorite Stores`}
      defaultOpen={true}
      infoTooltip="These are gift cards the list owner would appreciate. Click any card to visit the store."
    >
      <GiftCardSection listId={list.id} giftCards={giftCards} canEdit={false} />
    </CollapsibleSection>
  );
}
