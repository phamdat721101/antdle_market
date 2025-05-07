
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradeForm } from '../components/markets/TradeForm';
import { MarketActivity } from '../components/markets/MarketActivity';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistance, isPast } from 'date-fns';

interface Market {
  id: string;
  asset_name: string;
  strike_price: number;
  expiry_timestamp: string;
  yes_pool: number;
  no_pool: number;
  status: string;
  description?: string;
  on_chain_id?: string;
  creator_address?: string;
}

const MarketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trade');

  useEffect(() => {
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
      } catch (error) {
        console.error('Error fetching market:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMarket();
  }, [id]);

  const handleTradeSuccess = async () => {
    // Refresh market data
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('prediction_markets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setMarket(data as Market);
    } catch (error) {
      console.error('Error refreshing market:', error);
    }
  };

  const formatTimeToExpiry = (timestamp: string) => {
    const expiryDate = new Date(timestamp);
    const now = new Date();
    
    if (isPast(expiryDate)) {
      return "Expired";
    }
    
    return formatDistance(expiryDate, now, { addSuffix: true });
  };
  
  const calculateProbability = (yesPool: number, noPool: number) => {
    const total = yesPool + noPool;
    if (total === 0) return { yes: 50, no: 50 };
    
    const yesPct = (yesPool / total) * 100;
    const noPct = (noPool / total) * 100;
    
    return { yes: yesPct, no: noPct };
  };

  if (isLoading || !market) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-10"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-80 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  const { yes, no } = calculateProbability(market.yes_pool, market.no_pool);
  const isExpired = isPast(new Date(market.expiry_timestamp));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                {market.asset_name} {'>'} ${market.strike_price.toFixed(2)}
                <Badge className={`${market.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {market.status}
                </Badge>
                {market.on_chain_id && (
                  <Badge className="bg-purple-500">On-Chain</Badge>
                )}
              </h1>
              <p className="mt-1 text-gray-600">
                Expires {formatTimeToExpiry(market.expiry_timestamp)}
              </p>
              {market.description && (
                <p className="mt-3 text-gray-700">{market.description}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>Current probability distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-green-600">Yes ({yes.toFixed(1)}%)</span>
                    <span className="font-medium text-red-600">No ({no.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500" 
                      style={{ 
                        width: `${yes}%`, 
                        float: 'left'
                      }}
                    ></div>
                    <div 
                      className="h-full bg-red-500" 
                      style={{ width: `${no}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                    <p className="text-sm text-gray-600">YES Pool</p>
                    <p className="text-2xl font-bold text-green-600">{market.yes_pool.toLocaleString()} LEO</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <p className="text-sm text-gray-600">NO Pool</p>
                    <p className="text-2xl font-bold text-red-600">{market.no_pool.toLocaleString()} LEO</p>
                  </div>
                </div>
                
                {isExpired && market.status === 'settled' && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-lg mb-2">Market Results</p>
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-full ${true ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {true ? <Check size={20} /> : <X size={20} />}
                      </div>
                      <p className="text-gray-800">
                        {market.asset_name} price was{' '}
                        <span className="font-medium">{true ? 'above' : 'below'}</span>{' '}
                        ${market.strike_price} at expiry.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="mt-6">
              <Tabs defaultValue="activity" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="activity">
                  <MarketActivity marketId={market.id} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Trade</CardTitle>
                <CardDescription>Place your prediction</CardDescription>
              </CardHeader>
              <CardContent>
                <TradeForm 
                  marketId={market.id}
                  assetName={market.asset_name}
                  strikePrice={market.strike_price}
                  onSuccess={handleTradeSuccess}
                  onChainId={market.on_chain_id}  
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketDetail;
