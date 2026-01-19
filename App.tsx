import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * App.tsx - Main Application Container
 * Delegates all navigation to RootNavigator
 */
export default function App() {
  return (
    <div className="flex h-screen w-screen bg-white">
      <RootNavigator />
    </div>
  );
}
