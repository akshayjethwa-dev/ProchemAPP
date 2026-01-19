import React from 'react';

interface Props {
  onCategorySelect: any;
}

const CategoriesTab: React.FC<Props> = ({ onCategorySelect }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Categories</h2>
      <p>Categories tab - click to select</p>
    </div>
  );
};

export default CategoriesTab;
