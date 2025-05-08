
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistance } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  created_at: string;
  market_id: string;
  user_address: string;
  position: 'yes' | 'no';
  amount: number;
  tx_hash?: string;
}

interface MarketActivityProps {
  marketId: string;
}

export const MarketActivity = ({ marketId }: MarketActivityProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        // Query for actual trade activities from user_transactions table
        const { data, error } = await supabase
          .from('user_transactions')
          .select('*')
          .eq('market_id', marketId)
          .eq('tx_type', 'predict')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;

        // Transform the data to match our ActivityItem interface
        const formattedActivities: ActivityItem[] = data.map(tx => ({
          id: tx.id,
          created_at: tx.created_at,
          market_id: tx.market_id,
          user_address: tx.user_wallet_address,
          position: tx.position_type as 'yes' | 'no',
          amount: Number(tx.amount),
          tx_hash: tx.tx_hash
        }));
        
        // If no transactions found, use sample data for demonstration
        if (formattedActivities.length === 0) {
          const sampleActivities: ActivityItem[] = [
            {
              id: '1',
              created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
              market_id: marketId,
              user_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
              position: 'yes',
              amount: 25,
              tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            },
            {
              id: '2',
              created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
              market_id: marketId,
              user_address: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
              position: 'no',
              amount: 50
            },
            {
              id: '3',
              created_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
              market_id: marketId,
              user_address: '0x9876543210abcdef9876543210abcdef98765432',
              position: 'yes',
              amount: 10,
              tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
            }
          ];
          
          setActivities(sampleActivities);
        } else {
          setActivities(formattedActivities);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivities();
  }, [marketId]);

  const formatTimeAgo = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>No activity yet for this market.</p>
        <p className="text-sm mt-2">Be the first to make a prediction!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Badge className={activity.position === 'yes' ? 'bg-green-500' : 'bg-red-500'}>
                {activity.position === 'yes' ? 'YES' : 'NO'}
              </Badge>
              <span className="text-gray-800 font-medium">
                {formatAddress(activity.user_address)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {formatTimeAgo(activity.created_at)}
            </span>
          </div>
          
          <div className="mt-2 flex justify-between">
            <p className="text-sm text-gray-600">
              Predicted <span className="font-medium">{activity.amount} LEO</span>
            </p>
            {activity.tx_hash && (
              <a 
                href={`https://etherscan.io/tx/${activity.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline flex items-center"
              >
                View Transaction
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
