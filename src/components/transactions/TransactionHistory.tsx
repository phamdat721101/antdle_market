
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistance } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ArrowDown, ArrowUp, Check, X, Loader2 } from 'lucide-react';

interface Transaction {
  id: string;
  tx_hash: string;
  tx_type: string;
  position_type: string | null;
  amount: number | null;
  status: string;
  created_at: string;
  market?: {
    id: string;
    asset_name: string;
    strike_price: number;
  };
}

interface TransactionHistoryProps {
  walletAddress?: string;
  marketId?: string;
  limit?: number;
  className?: string;
}

export const TransactionHistory = ({ 
  walletAddress, 
  marketId,
  limit = 20,
  className = '' 
}: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      
      const currentWallet = walletAddress || localStorage.getItem('walletAddress');
      if (!currentWallet && !marketId) {
        setIsLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('user_transactions')
          .select(`
            *,
            market:market_id (
              id,
              asset_name,
              strike_price
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        // Add filters if provided
        if (currentWallet) {
          query = query.eq('user_wallet_address', currentWallet);
        }
        
        if (marketId) {
          query = query.eq('market_id', marketId);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setTransactions(data as Transaction[]);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [walletAddress, marketId, limit]);

  const formatTimeAgo = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getTypeIcon = (txType: string, positionType: string | null) => {
    switch (txType) {
      case 'approve':
        return <Check className="h-4 w-4 text-blue-500" />;
      case 'predict':
        return positionType === 'yes' ? 
          <ArrowUp className="h-4 w-4 text-green-500" /> : 
          <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'claim':
        return <Check className="h-4 w-4 text-orange-500" />;
      case 'swap':
        return <ArrowDown className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const formatTransactionType = (txType: string, positionType: string | null) => {
    switch (txType) {
      case 'approve':
        return 'Token Approval';
      case 'predict':
        return `${positionType === 'yes' ? 'YES' : 'NO'} Prediction`;
      case 'claim':
        return 'Claim Rewards';
      case 'swap':
        return 'Token Swap';
      default:
        return txType;
    }
  };

  const getExplorerUrl = (txHash: string) => {
    const chainId = localStorage.getItem('chainId');
    let explorerUrl = 'https://etherscan.io'; // Default to Ethereum
    
    switch (chainId) {
      case '0x89':
      case '0x13881':
        explorerUrl = chainId === '0x89' ? 'https://polygonscan.com' : 'https://mumbai.polygonscan.com';
        break;
      case '0xa86a':
      case '0xa869':
        explorerUrl = chainId === '0xa86a' ? 'https://snowtrace.io' : 'https://testnet.snowtrace.io';
        break;
      default:
        // Use Ethereum explorer for other chains or if chainId is not available
        explorerUrl = 'https://etherscan.io';
    }
    
    return `${explorerUrl}/tx/${txHash}`;
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>No transactions found</p>
          {!marketId && (
            <p className="text-sm mt-2">Make predictions to see your on-chain transactions here</p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(tx.tx_type, tx.position_type)}
                      <span>{formatTransactionType(tx.tx_type, tx.position_type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tx.market ? (
                      <span className="text-sm">
                        {tx.market.asset_name} {`>`} ${tx.market.strike_price}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.amount ? (
                      <span className="font-medium">{tx.amount} LEO</span>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-500">{formatTimeAgo(tx.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(tx.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <a 
                      href={getExplorerUrl(tx.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:underline flex items-center justify-end"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
