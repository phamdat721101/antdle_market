
import React from 'react';
import { MarketCard } from './MarketCard';

interface Market {
  id: string;
  asset_name: string;
  strike_price: number;
  expiry_timestamp: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  description?: string;
}

interface MarketGridProps {
  markets: Market[];
  isLoading?: boolean;
}

export const MarketGrid = ({ markets, isLoading }: MarketGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-500">No markets available</h3>
        <p className="mt-2 text-gray-400">Check back soon for new prediction markets</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard
          key={market.id}
          id={market.id}
          assetName={market.asset_name}
          strikePrice={Number(market.strike_price)}
          expiryTimestamp={market.expiry_timestamp}
          yesPool={Number(market.yes_pool)}
          noPool={Number(market.no_pool)}
          status={market.status}
          description={market.description}
        />
      ))}
    </div>
  );
};
