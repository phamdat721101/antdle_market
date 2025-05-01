
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

interface Market {
  id: string;
  asset_name: string;
  strike_price: number;
  expiry_timestamp: string;
  status: string;
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
  
  // Simulated wallet address for demo purposes
  useEffect(() => {
    const simulatedAddress = '0x123456789abcdef0123456789abcdef012345678';
    setWalletAddress(simulatedAddress);
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
            status
          )
        `)
        .eq('user_wallet_address', walletAddress);
      
      if (error) throw error;
      setPositions(data as Position[]);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchPositions();
    }
  }, [walletAddress]);

  const handleClaimRewards = async (positionId: string) => {
    try {
      // Update the claimed status to true
      const { error } = await supabase
        .from('user_positions')
        .update({ claimed: true })
        .eq('id', positionId);
      
      if (error) throw error;
      
      // Refresh the positions list
      fetchPositions();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    }
  };

  const getPositionValue = (position: Position): number => {
    // This is a simplified calculation
    // In a real app, this would be calculated based on the pool sizes and odds
    return position.amount;
  };

  const calculateTotalValue = (): number => {
    return positions.reduce((total, position) => total + getPositionValue(position), 0);
  };

  const isMarketExpired = (expiryTimestamp: string): boolean => {
    return new Date(expiryTimestamp) <= new Date();
  };

  const isWinningPosition = (position: Position): boolean => {
    // Simplified logic - in a real app, this would check the settled price against the strike price
    const market = position.market;
    if (market.status !== 'settled') return false;
    
    // Randomly determine if this position is winning (for demo purposes)
    // In reality, this would be determined by comparing settled price to strike price
    const random = position.id.charCodeAt(0) % 2 === 0;
    return (position.position_type === 'yes' && random) || 
           (position.position_type === 'no' && !random);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Positions</h1>
        
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
                      <p className="text-2xl font-bold">${calculateTotalValue().toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Wallet</p>
                      <p className="text-sm font-mono truncate">{walletAddress}</p>
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
                          <TableCell>${Number(position.amount).toFixed(2)}</TableCell>
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
                              >
                                Claim
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
                <p className="text-gray-500 mb-6">You haven't made any predictions yet</p>
                <Link to="/markets">
                  <Button className="bg-orange-600 hover:bg-orange-700">Browse Markets</Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect your wallet</h3>
            <p className="text-gray-500 mb-6">Connect your wallet to view your positions</p>
            <Button className="bg-orange-600 hover:bg-orange-700">Connect Wallet</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyPositions;
