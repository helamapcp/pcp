import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionItem {
  id: string;
  label: string;
  items: Array<{
    id: string;
    name: string;
    standardBagWeight: number;
  }>;
}

interface ProductAccordionProps {
  items: AccordionItem[];
  onSelectProduct: (productId: string, productName: string, standardBagWeight: number) => void;
}

export function ProductAccordion({ items, onSelectProduct }: ProductAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-2">
      {items.map(category => (
        <div key={category.id} className="border border-slate-600 rounded-lg overflow-hidden bg-slate-700/30">
          {/* Category Header */}
          <button
            onClick={() => toggleExpand(category.id)}
            className={cn(
              'w-full px-4 py-4 flex items-center justify-between font-bold text-lg transition-colors',
              expandedId === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-white hover:bg-slate-700'
            )}
          >
            <span>{category.label}</span>
            <ChevronDown
              className={cn(
                'w-5 h-5 transition-transform',
                expandedId === category.id && 'rotate-180'
              )}
            />
          </button>

          {/* Products List */}
          {expandedId === category.id && (
            <div className="border-t border-slate-600">
              {category.items.map(product => (
                <button
                  key={product.id}
                  onClick={() => onSelectProduct(product.id, product.name, product.standardBagWeight)}
                  className="w-full px-4 py-3 text-left border-b border-slate-600 last:border-b-0 hover:bg-blue-600/20 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-white font-semibold">{product.name}</p>
                    <p className="text-slate-400 text-xs">Padrão: {product.standardBagWeight}kg</p>
                  </div>
                  <div className="text-blue-400 group-hover:text-blue-300 text-sm font-bold">→</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
