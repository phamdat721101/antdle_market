
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { simulatePlacePrediction } from '@/utils/simulationService';

interface TradeFormProps {
  marketId: string;
  assetName: string;
  strikePrice: number;
  onSuccess: () => void;
}

export const TradeForm = ({ marketId, assetName, strikePrice, onSuccess }: TradeFormProps) => {
  const [position, setPosition] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'pending' | 'confirmed' | 'failed' | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if wallet is connected
    const walletAddress = localStorage.getItem('walletAddress');
    
    if (!walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    // Check if connected to any chain
    const chainConnected = localStorage.getItem('chainConnected') === 'true';
    if (!chainConnected) {
      toast({
        title: "No Network Connected",
        description: "Please connect to a blockchain network via MetaMask",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setTxStatus('pending');
    try {
      // Simulate on-chain transaction
      const amountValue = parseFloat(amount);
      const result = await simulatePlacePrediction(
        walletAddress,
        marketId,
        position,
        amountValue
      );
      
      setTxHash(result.txHash);
      setTxStatus('confirmed');
      
      // Get chain name for better user experience
      const chainName = localStorage.getItem('chainName') || 'blockchain';
      
      toast({
        title: "Transaction Confirmed",
        description: `Your ${position.toUpperCase()} prediction for ${amount} LEO has been placed on ${chainName}`,
      });
      
      setAmount('');
      onSuccess();
    } catch (error: any) {
      console.error("Transaction error:", error);
      setTxStatus('failed');
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to place prediction on-chain",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
        <h3 className="font-medium text-lg mb-2">Market</h3>
        <p>Will {assetName} be above ${strikePrice} at expiry?</p>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Choose Position</h3>
        <RadioGroup 
          value={position} 
          onValueChange={(value) => setPosition(value as 'yes' | 'no')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="yes" />
            <Label htmlFor="yes" className="font-medium text-green-600">YES</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="no" />
            <Label htmlFor="no" className="font-medium text-red-600">NO</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <Label htmlFor="amount">Amount (LEO)</Label>
        <div className="mt-1">
          <Input
            id="amount"
            placeholder="0.0"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          *Transaction will be processed on-chain
        </p>
      </div>
      
      {txStatus === 'pending' && txHash && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm flex items-center">
            <span className="inline-block h-2 w-2 bg-blue-600 rounded-full animate-pulse mr-2"></span>
            Transaction pending: {txHash.substring(0, 6)}...{txHash.substring(txHash.length - 4)}
          </p>
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full bg-orange-600 hover:bg-orange-700" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing On-Chain...' : 'Place On-Chain Prediction'}
      </Button>
    </form>
  );
};
