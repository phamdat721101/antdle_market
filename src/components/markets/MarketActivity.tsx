
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
        // Query for trade activities related to this market
        const { data, error } = await supabase
          .from('market_activities')
          .select('*')
          .eq('market_id', marketId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        setActivities(data || []);
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
