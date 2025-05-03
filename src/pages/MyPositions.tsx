
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { simulateClaimRewards } from '@/utils/simulationService';
import { useToast } from '@/hooks/use-toast';

interface Market {
  id: string;
  asset_name: string;
  strike_price: number;
  expiry_timestamp: string;
  status: string;
  settled_price?: number | null; // Make settled_price optional
}

interface Position {
  id: string;
  user_wallet_address: string;
  market_id: string;
  position_type: 'yes' | 'no';
  amount: number;
  timestamp: string;
  claimed: boolean;
  market: Market;
}

const MyPositions = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get wallet address from localStorage on component mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    setWalletAddress(savedAddress);
    
    // Listen for wallet connection/disconnection events
    const handleStorageChange = () => {
      const currentAddress = localStorage.getItem('walletAddress');
      setWalletAddress(currentAddress);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchPositions = async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    try {
      // Fetch positions with market details
      const { data, error } = await supabase
        .from('user_positions')
        .select(`
          *,
          market:market_id (
            id, 
            asset_name, 
            strike_price, 
            expiry_timestamp,
            status,
            settled_price
          )
        `)
        .eq('user_wallet_address', walletAddress);
      
      if (error) throw error;
      setPositions(data as Position[]);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: "Error",
        description: "Failed to load your positions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchPositions();
    } else {
      setPositions([]);
    }
  }, [walletAddress]);

  const handleClaimRewards = async (positionId: string) => {
    // Check if connected to correct chain
    const chainConnected = localStorage.getItem('chainConnected') === 'true';
    if (!chainConnected) {
      toast({
        title: "Wrong Network",
        description: "Please connect to the LeoFi Prediction Chain",
        variant: "destructive",
      });
      return;
    }
    
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      });
      return;
    }
    
    setClaimingId(positionId);
    try {
      // Simulate claiming rewards on-chain
      const result = await simulateClaimRewards(walletAddress, positionId);
      
      toast({
        title: "Rewards Claimed",
        description: `Successfully claimed ${result.rewardAmount} LEO tokens on-chain`,
      });
      
      // Refresh positions
      fetchPositions();
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    } finally {
      setClaimingId(null);
    }
  };

  const getPositionValue = (position: Position): number => {
    // Calculate position value based on amount
    return position.amount;
  };

  const calculateTotalValue = (): number => {
    return positions.reduce((total, position) => total + getPositionValue(position), 0);
  };

  const isMarketExpired = (expiryTimestamp: string): boolean => {
    return new Date(expiryTimestamp) <= new Date();
  };

  const isWinningPosition = (position: Position): boolean => {
    const market = position.market;
    if (market.status !== 'settled' || market.settled_price === null || market.settled_price === undefined) return false;
    
    // Determine if position is winning based on settled price vs strike price
    return (position.position_type === 'yes' && market.settled_price > market.strike_price) || 
           (position.position_type === 'no' && market.settled_price <= market.strike_price);
  };

  const renderPositionStatus = (position: Position) => {
    const market = position.market;
    
    if (market.status === 'active') {
      return <Badge className="bg-blue-500">Active</Badge>;
    }
    
    if (market.status === 'settled') {
      if (isWinningPosition(position)) {
        return position.claimed ? 
          <Badge className="bg-green-500">Claimed</Badge> : 
          <Badge className="bg-green-500">Won</Badge>;
      } else {
        return <Badge className="bg-red-500">Lost</Badge>;
      }
    }
    
    return <Badge>Unknown</Badge>;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My On-Chain Positions</h1>
        
        {walletAddress ? (
          <>
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Positions</p>
                      <p className="text-2xl font-bold">{positions.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-2xl font-bold">{calculateTotalValue().toFixed(2)} LEO</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Connected Wallet</p>
                      <p className="text-sm font-mono truncate">{walletAddress}</p>
                      <p className="text-xs text-gray-500">LeoFi Prediction Chain</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : positions.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Market</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell>
                            <Link to={`/markets/${position.market_id}`} className="text-blue-600 hover:underline">
                              {position.market.asset_name} {`>`} ${Number(position.market.strike_price).toFixed(2)}
                            </Link>
                          </TableCell>
                          <TableCell className={position.position_type === 'yes' ? 'text-green-500' : 'text-red-500'}>
                            {position.position_type === 'yes' ? 'Above' : 'Below'}
                          </TableCell>
                          <TableCell>{position.amount.toFixed(2)} LEO</TableCell>
                          <TableCell>{new Date(position.timestamp).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {isMarketExpired(position.market.expiry_timestamp) ? 
                              'Expired' : 
                              formatDistance(new Date(position.market.expiry_timestamp), new Date(), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {renderPositionStatus(position)}
                          </TableCell>
                          <TableCell className="text-right">
                            {position.market.status === 'settled' && 
                             isWinningPosition(position) && 
                             !position.claimed && (
                              <Button 
                                size="sm" 
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={() => handleClaimRewards(position.id)}
                                disabled={claimingId === position.id}
                              >
                                {claimingId === position.id ? 'Claiming...' : 'Claim On-Chain'}
                              </Button>
                            )}
                            {(position.market.status === 'active' || !isWinningPosition(position) || position.claimed) && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-gray-500 border-gray-300"
                                disabled
                              >
                                {position.market.status === 'active' ? 'Active' : position.claimed ? 'Claimed' : 'Lost'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions yet</h3>
                <p className="text-gray-500 mb-6">You haven't made any on-chain predictions yet</p>
                <Link to="/markets">
                  <Button className="bg-orange-600 hover:bg-orange-700">Browse Markets</Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect your wallet</h3>
            <p className="text-gray-500 mb-6">Connect your wallet to the LeoFi Prediction Chain to view your positions</p>
            <Button className="bg-orange-600 hover:bg-orange-700">Connect Wallet</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyPositions;
