import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradeForm } from '../components/markets/TradeForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistance } from 'date-fns';
import { simulateClaimRewards } from '@/utils/simulationService';

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
  contract_address?: string;
}

interface UserPosition {
  id: string;
  position_type: 'yes' | 'no';
  amount: number;
  claimed: boolean;
}

const MarketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
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
      
      // Fetch user position if wallet is connected
      const walletAddress = localStorage.getItem('walletAddress');
      if (walletAddress) {
        const { data: positionData, error: positionError } = await supabase
          .from('user_positions')
          .select('*')
          .eq('market_id', id)
          .eq('user_wallet_address', walletAddress)
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (!positionError && positionData && positionData.length > 0) {
          setUserPosition(positionData[0] as UserPosition);
        }
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

  // Listen for wallet connection/disconnection changes
  useEffect(() => {
    const checkWallet = () => {
      const walletAddress = localStorage.getItem('walletAddress');
      if (!walletAddress && userPosition) {
        setUserPosition(null);
      } else if (walletAddress && !userPosition && id) {
        fetchMarket();
      }
    };
    
    window.addEventListener('storage', checkWallet);
    
    return () => {
      window.removeEventListener('storage', checkWallet);
    };
  }, [id, userPosition]);

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
    if (!userPosition || !market) return;
    
    const walletAddress = localStorage.getItem('walletAddress');
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim winnings",
        variant: "destructive",
      });
      return;
    }
    
    // Check if connected to any chain
    const chainConnected = localStorage.getItem('chainConnected') === 'true';
    if (!chainConnected) {
      toast({
        title: "No Network Connected",
        description: "Please connect to a blockchain network via MetaMask",
        variant: "destructive",
      });
      return;
    }
    
    setIsClaiming(true);
    try {
      // Simulate on-chain claim transaction
      const result = await simulateClaimRewards(walletAddress, userPosition.id);
      
      // Get chain name for better user experience
      const chainName = localStorage.getItem('chainName') || 'blockchain';
      
      toast({
        title: "Winnings Claimed",
        description: `Your winnings of ${result.rewardAmount} LEO have been sent to your wallet on ${chainName}`,
      });
      
      fetchMarket(); // Refresh data to show claimed status
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim winnings",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
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

  // Check if user has winning position
  const hasWinningPosition = userPosition && market.status === 'settled' && market.settled_price !== null && (
    (userPosition.position_type === 'yes' && Number(market.settled_price) > Number(market.strike_price)) ||
    (userPosition.position_type === 'no' && Number(market.settled_price) <= Number(market.strike_price))
  );

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
            {market.contract_address && (
              <p className="mt-2">
                Contract: <span className="font-mono text-xs">{market.contract_address}</span>
              </p>
            )}
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
                {/* User position display */}
                {userPosition && (
                  <div className={`p-4 mb-6 rounded-lg border ${userPosition.position_type === 'yes' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className="font-medium mb-1">Your On-Chain Position</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p>
                          <span className="font-bold">{userPosition.position_type === 'yes' ? 'YES' : 'NO'}</span>
                          <span className="ml-2">({userPosition.amount} LEO)</span>
                        </p>
                      </div>
                      {market.status === 'settled' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${hasWinningPosition ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {hasWinningPosition ? (userPosition.claimed ? 'Claimed' : 'Winner') : 'Lost'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

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
                    <p className="text-xl font-bold">{Number(market.yes_pool).toFixed(2)} LEO</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <p className="text-sm text-red-600 mb-1">NO Pool</p>
                    <p className="text-xl font-bold">{Number(market.no_pool).toFixed(2)} LEO</p>
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

                {hasWinningPosition && !userPosition.claimed && (
                  <Button 
                    onClick={handleClaimWinnings} 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isClaiming}
                  >
                    {isClaiming ? 'Processing On-Chain...' : 'Claim Winnings On-Chain'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            {market.status === 'active' && !isExpired ? (
              <Card>
                <CardHeader className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white">
                  <h2 className="text-xl font-bold">Trade On-Chain</h2>
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
