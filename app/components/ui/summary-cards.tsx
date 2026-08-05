interface SummaryCard {
  label: string;
  value: string;
  className?: string;
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
      {cards.map(card => (
        <div
          key={card.label}
          className="bg-base-100 border border-base-200 rounded-lg px-3 py-2 shadow-sm whitespace-nowrap"
        >
          <div className="text-[10px] opacity-70 leading-none">{card.label}</div>
          <div className={`text-sm font-semibold ${card.className ?? ''}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
