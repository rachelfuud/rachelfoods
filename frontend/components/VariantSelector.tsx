'use client';

import { ProductVariant } from '@/lib/types';

interface VariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId: string;
    onVariantChange: (variantId: string) => void;
}

export default function VariantSelector({ variants, selectedVariantId, onVariantChange }: VariantSelectorProps) {
    if (!variants || variants.length <= 1) {
        return null;
    }

    const selectedVariant = variants.find(v => v.id === selectedVariantId);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                    Size / Quantity
                </label>
                {selectedVariant && (
                    <span className="text-sm text-gray-500">
                        {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants
                    .filter(v => v.isActive)
                    .map((variant) => {
                        const isSelected = variant.id === selectedVariantId;
                        const isOutOfStock = variant.stock <= 0;

                        return (
                            <button
                                key={variant.id}
                                onClick={() => !isOutOfStock && onVariantChange(variant.id)}
                                disabled={isOutOfStock}
                                className={`
                                    relative p-3 rounded-lg border-2 transition-all text-left
                                    ${isSelected
                                        ? 'border-green-600 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }
                                    ${isOutOfStock
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer'
                                    }
                                `}
                            >
                                <div className="font-medium text-sm text-gray-900">
                                    {variant.name}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                    ${variant.price.toFixed(2)}
                                </div>

                                {isSelected && (
                                    <div className="absolute top-2 right-2">
                                        <svg
                                            className="w-4 h-4 text-green-600"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                )}

                                {isOutOfStock && (
                                    <div className="text-xs text-red-600 mt-1">
                                        Out of stock
                                    </div>
                                )}
                            </button>
                        );
                    })}
            </div>
        </div>
    );
}
