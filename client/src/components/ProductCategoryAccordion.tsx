import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/contexts/PVCInventoryContext';

interface ProductCategoryAccordionProps {
  categories: string[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export function ProductCategoryAccordion({
  categories,
  products,
  onSelectProduct,
}: ProductCategoryAccordionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div className="space-y-3">
      {categories.map(category => {
        const categoryProducts = products.filter(p => p.category === category);
        const isExpanded = expandedCategory === category;

        return (
          <div
            key={category}
            className="border-2 border-slate-600 rounded-xl overflow-hidden bg-slate-800/50"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className={cn(
                'w-full px-4 py-4 flex items-center justify-between font-bold text-lg transition-colors',
                isExpanded
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/70 text-white hover:bg-slate-700'
              )}
            >
              <span>{category}</span>
              <ChevronDown
                className={cn(
                  'w-6 h-6 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </button>

            {/* Products List */}
            {isExpanded && (
              <div className="border-t border-slate-600 divide-y divide-slate-600">
                {categoryProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    className="w-full px-4 py-4 text-left hover:bg-blue-600/20 transition-colors flex items-center justify-between group active:bg-blue-600/40"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold text-base">{product.name}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Padrão: {product.standardBagWeight}kg
                      </p>
                    </div>
                    <div className="text-blue-400 group-hover:text-blue-300 text-2xl ml-2">→</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
