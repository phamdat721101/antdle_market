
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPosition {
  id: string;
  market_id: string;
  position_type: 'yes' | 'no';
  amount: number;
  timestamp: string;
  claimed: boolean;
  market: {
    asset_name: string;
    strike_price: number;
    status: string;
    expiry_timestamp: string;
    settled_price: number | null;
  };
}

const MyPositions = () => {
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPositions = async () => {
    setIsLoading(true);
    
    // This would be replaced with actual wallet address in production
    const mockWalletAddress = localStorage.getItem('walletAddress');
    
    if (!mockWalletAddress) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_positions')
        .select(`
          *,
          market:prediction_markets(
            asset_name,
            strike_price,
            status,
            expiry_timestamp,
            settled_price
          )
        `)
        .eq('user_wallet_address', mockWalletAddress)
        .order('timestamp', { ascending: false });
        
      if (error) throw error;
      setPositions(data as unknown as UserPosition[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load positions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    
    // Mock wallet connection for demo
    if (!localStorage.getItem('walletAddress')) {
      localStorage.setItem('walletAddress', '0x' + Math.random().toString(16).substring(2, 14));
    }
  }, []);

  const handleClaim = async (positionId: string) => {
    try {
      const { error } = await supabase
        .from('user_positions')
        .update({ claimed: true })
        .eq('id', positionId);
        
      if (error) throw error;
      
      toast({
        title: "Position Claimed",
        description: "Your winnings have been claimed successfully",
      });
      
      fetchPositions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim position",
        variant: "destructive",
      });
    }
  };

  const getOutcomeStatus = (position: UserPosition) => {
    if (position.market.status !== 'settled' || position.market.settled_price === null) {
      return "Pending";
    }
    
    const isYesWin = Number(position.market.settled_price) > Number(position.market.strike_price);
    
    if ((position.position_type === 'yes' && isYesWin) || 
        (position.position_type === 'no' && !isYesWin)) {
      return "Win";
    } else {
      return "Loss";
    }
  };

  const handleConnect = () => {
    localStorage.setItem('walletAddress', '0x' + Math.random().toString(16).substring(2, 14));
    fetchPositions();
  };

  if (!localStorage.getItem('walletAddress')) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">My Positions</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your positions</p>
          <Button onClick={handleConnect} className="bg-purple-600 hover:bg-purple-700">
            Connect Wallet
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Positions</h1>

        {isLoading ? (
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-500 mb-2">No positions yet</h3>
            <p className="text-gray-400 mb-6">You haven't opened any prediction positions yet</p>
            <Link to="/markets">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Browse Markets
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const outcomeStatus = getOutcomeStatus(position);
                  const date = new Date(position.timestamp).toLocaleDateString();
                  
                  return (
                    <TableRow key={position.id}>
                      <TableCell>
                        <Link to={`/markets/${position.market_id}`} className="text-blue-600 hover:underline">
                          {position.market.asset_name} > ${Number(position.market.strike_price).toFixed(2)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={position.position_type === 'yes' ? 'text-green-600' : 'text-red-600'}>
                          {position.position_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{Number(position.amount).toFixed(2)}</TableCell>
                      <TableCell>{date}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium
                            ${position.market.status === 'active' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'}`}
                        >
                          {position.market.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {outcomeStatus === "Pending" ? (
                          <span className="text-yellow-600">Pending</span>
                        ) : outcomeStatus === "Win" ? (
                          <span className="text-green-600">Win</span>
                        ) : (
                          <span className="text-red-600">Loss</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {outcomeStatus === "Win" && !position.claimed && position.market.status === 'settled' ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleClaim(position.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Claim
                          </Button>
                        ) : position.claimed ? (
                          <span className="text-green-600">Claimed</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyPositions;
