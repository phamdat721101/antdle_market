
import React from 'react';
import { Layout } from '../components/layout/Layout';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Transactions = () => {
  const { isConnected, walletAddress, connectWallet } = useWallet();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Transaction History</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">View your on-chain transaction history</p>

        {walletAddress ? (
          <Card className="border border-orange-100 dark:border-orange-900 shadow-md">
            <CardHeader className="bg-secondary/80 dark:bg-secondary/20">
              <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TransactionHistory walletAddress={walletAddress} limit={50} />
            </CardContent>
          </Card>
        ) : (
          <div className="text-center p-12 bg-secondary rounded-lg border border-orange-100 dark:border-orange-900">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Connect your wallet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Connect your wallet to view your transaction history</p>
            <Button onClick={connectWallet} className="bg-primary hover:bg-primary/90">Connect Wallet</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
