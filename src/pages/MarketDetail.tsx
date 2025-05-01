
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradeForm } from '../components/markets/TradeForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';

interface Market {
  id: string;
  asset_name: string;
  strike_price: number;
  expiry_timestamp: string;
  creation_timestamp: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  settled_price: number | null;
  description?: string;
}

const MarketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchMarket = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setMarket(data as Market);
      
      // Fetch latest price
      const assetName = data.asset_name;
      const { data: priceData, error: priceError } = await supabase
        .from('price_feeds')
        .select('price')
        .eq('asset_name', assetName)
        .order('timestamp', { ascending: false })
        .limit(1);
        
      if (priceError) throw priceError;
      if (priceData && priceData.length > 0) {
        setLatestPrice(priceData[0].price);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load market details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarket();
  }, [id]);

  const handleSettleMarket = async () => {
    if (!market || !latestPrice) return;
    
    try {
      const { error } = await supabase
        .from('prediction_markets')
        .update({
          status: 'settled',
          settled_price: latestPrice
        })
        .eq('id', market.id);

      if (error) throw error;
      
      toast({
        title: "Market Settled",
        description: `Market has been settled with price $${latestPrice}`,
      });
      
      fetchMarket();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to settle market",
        variant: "destructive",
      });
    }
  };

  const handleClaimWinnings = async () => {
    toast({
      title: "Coming Soon",
      description: "Claiming functionality will be available in the next update",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </Layout>
    );
  }

  if (!market) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Market not found</h2>
        </div>
      </Layout>
    );
  }

  const totalPool = Number(market.yes_pool) + Number(market.no_pool);
  const yesPercentage = totalPool > 0 ? (Number(market.yes_pool) / totalPool) * 100 : 50;
  const noPercentage = totalPool > 0 ? (Number(market.no_pool) / totalPool) * 100 : 50;
  
  const expiryDate = new Date(market.expiry_timestamp);
  const isExpired = expiryDate <= new Date();
  const timeToExpiry = formatDistance(expiryDate, new Date(), { addSuffix: true });
  
  const creationDate = new Date(market.creation_timestamp);
  
  // Determine market outcome if settled
  let outcome = null;
  if (market.status === 'settled' && market.settled_price !== null) {
    outcome = Number(market.settled_price) > Number(market.strike_price) ? 'YES' : 'NO';
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{market.asset_name} Prediction</h1>
            <span className={`px-4 py-1 rounded-full text-sm font-medium 
              ${market.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {market.status === 'active' ? 'Active' : 'Settled'}
            </span>
          </div>
          {market.description && (
            <p className="mt-2 text-gray-600">{market.description}</p>
          )}
          <div className="mt-4 text-sm text-gray-500">
            <p>Created: {creationDate.toLocaleDateString()}</p>
            <p>Expires: {timeToExpiry}</p>
            {latestPrice && (
              <p className="font-medium text-blue-600 mt-2">
                Current Price: ${latestPrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-800 to-purple-800 text-white">
                <h2 className="text-xl font-bold">
                  Will {market.asset_name} be above ${Number(market.strike_price).toFixed(2)} at expiry?
                </h2>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Yes ({yesPercentage.toFixed(1)}%)</span>
                    <span>No ({noPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ width: `${yesPercentage}%`, float: 'left' }}
                    ></div>
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${noPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <p className="text-sm text-green-600 mb-1">YES Pool</p>
                    <p className="text-xl font-bold">{Number(market.yes_pool).toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <p className="text-sm text-red-600 mb-1">NO Pool</p>
                    <p className="text-xl font-bold">{Number(market.no_pool).toFixed(2)}</p>
                  </div>
                </div>

                {market.status === 'settled' && market.settled_price !== null && (
                  <div className="p-6 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                    <h3 className="font-bold text-lg mb-2">Market Settled</h3>
                    <p>Final Price: ${Number(market.settled_price).toFixed(2)}</p>
                    <p>Strike Price: ${Number(market.strike_price).toFixed(2)}</p>
                    <p className={`mt-2 font-bold ${outcome === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                      Outcome: {outcome} wins
                    </p>
                  </div>
                )}

                {market.status === 'active' && isExpired && (
                  <Button 
                    onClick={handleSettleMarket} 
                    className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
                  >
                    Settle Market Now
                  </Button>
                )}

                {market.status === 'settled' && (
                  <Button 
                    onClick={handleClaimWinnings} 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Claim Winnings
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            {market.status === 'active' && !isExpired ? (
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white">
                  <h2 className="text-xl font-bold">Trade</h2>
                </CardHeader>
                <CardContent className="pt-6">
                  <TradeForm 
                    marketId={market.id}
                    assetName={market.asset_name}
                    strikePrice={Number(market.strike_price)}
                    onSuccess={fetchMarket}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white">
                  <h2 className="text-xl font-bold">Market {market.status === 'settled' ? 'Settled' : 'Expired'}</h2>
                </CardHeader>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4">
                    This market is no longer active for trading.
                  </p>
                  {market.status !== 'settled' && (
                    <Button 
                      onClick={handleSettleMarket} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Settle Market
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDetail;
