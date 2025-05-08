
import React from 'react';
import { Layout } from '../components/layout/Layout';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Transactions = () => {
  const { isConnected, walletAddress, connectWallet, leoBalance } = useWallet();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Transaction History</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">View your on-chain transaction history</p>

        {walletAddress ? (
          <>
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
              <h3 className="font-medium text-lg">Your LEO Balance</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{leoBalance} LEO</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Token Address: {`0xA1F...1875`}</p>
            </div>
            <Card className="border border-orange-100 dark:border-orange-900 shadow-md">
              <CardHeader className="bg-orange-50/80 dark:bg-orange-900/20">
                <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionHistory 
                  walletAddress={walletAddress} 
                  limit={50} 
                  hideApprovalTransactions={true} 
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center p-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Connect your wallet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Connect your wallet to view your transaction history</p>
            <Button onClick={connectWallet} className="bg-orange-500 hover:bg-orange-600 text-white">Connect Wallet</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
