import React from 'react';
import { CartItem } from '../types';

interface Props {
  items: CartItem[];
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onBrowse: () => void;
}

const CartTab: React.FC<Props> = ({ items, onRemove, onCheckout, onBrowse }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Cart ({items.length})</h2>
      <button onClick={onCheckout} className="p-3 bg-green-500 text-white rounded mb-4">Checkout</button>
    </div>
  );
};

export default CartTab;
