
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketGrid } from '../components/markets/MarketGrid';
import { CreateMarketForm } from '../components/markets/CreateMarketForm';
import { supabase } from '@/integrations/supabase/client';

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

const MarketsList = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchMarkets = async () => {
    setIsLoading(true);
    try {
      const query = supabase
        .from('prediction_markets')
        .select('*');
        
      if (activeTab === 'active') {
        query.eq('status', 'active');
      } else if (activeTab === 'settled') {
        query.eq('status', 'settled');
      } else if (activeTab === 'on-chain') {
        query.not('on_chain_id', 'is', null);
      }
      
      const { data, error } = await query.order('creation_timestamp', { ascending: false });
      
      if (error) throw error;
      setMarkets(data as Market[]);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, [activeTab]);

  const handleCreateSuccess = () => {
    setIsDialogOpen(false);
    fetchMarkets();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prediction Markets</h1>
            <p className="mt-1 text-muted-foreground">Predict the future price of assets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 bg-primary hover:bg-primary/90">
                Create Market
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Prediction Market</DialogTitle>
              </DialogHeader>
              <CreateMarketForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="active">Active Markets</TabsTrigger>
            <TabsTrigger value="settled">Settled Markets</TabsTrigger>
            <TabsTrigger value="on-chain">On-Chain Markets</TabsTrigger>
            <TabsTrigger value="all">All Markets</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <MarketGrid markets={markets} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default MarketsList;
