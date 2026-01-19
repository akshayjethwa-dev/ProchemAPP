import React from 'react';
import { Order } from '../types';

interface Props {
  orders: Order[];
  onTrack: (o: Order) => void;
  onBrowse: () => void;
}

const OrdersTab: React.FC<Props> = ({ orders, onTrack, onBrowse }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Orders ({orders.length})</h2>
    </div>
  );
};

export default OrdersTab;
