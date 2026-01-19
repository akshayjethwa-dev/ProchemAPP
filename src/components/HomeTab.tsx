import React from 'react';
import { Product } from '../types';

interface Props {
  profile: any;
  allProducts: Product[];
  onProductSelect: (p: Product) => void;
  onCategorySelect: any;
  onNotifications: () => void;
}

const HomeTab: React.FC<Props> = ({ profile, allProducts, onProductSelect, onCategorySelect, onNotifications }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Home</h2>
      <p>Products: {allProducts.length}</p>
      <button onClick={onNotifications} className="mt-4 p-2 bg-blue-500 text-white rounded">Notifications</button>
    </div>
  );
};

export default HomeTab;
