
import React from 'react';
import { Layout } from '../components/layout/Layout';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Transactions = () => {
  const walletAddress = localStorage.getItem('walletAddress');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h1>
        <p className="text-gray-600 mb-8">View your on-chain transaction history</p>

        {walletAddress ? (
          <TransactionHistory walletAddress={walletAddress} limit={50} />
        ) : (
          <div className="text-center p-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect your wallet</h3>
            <p className="text-gray-500 mb-6">Connect your wallet to view your transaction history</p>
            <Button className="bg-orange-600 hover:bg-orange-700">Connect Wallet</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
