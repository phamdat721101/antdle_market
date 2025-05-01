
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

    // Check if wallet is connected (this would be handled by a real wallet provider)
    const mockWalletAddress = localStorage.getItem('walletAddress');
    if (!mockWalletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real app, we would call a smart contract here
      // For now, we'll just update the database
      const amountValue = parseFloat(amount);
      
      // First update the market's pool
      const { error: marketError } = await supabase
        .from('prediction_markets')
        .update({
          [`${position}_pool`]: supabase.rpc('get_latest_price', { 
            asset: position === 'yes' ? 'yes_pool' : 'no_pool' 
          }) + amountValue
        })
        .eq('id', marketId);

      if (marketError) throw marketError;

      // Then record the user's position
      const { error: positionError } = await supabase
        .from('user_positions')
        .insert({
          market_id: marketId,
          user_wallet_address: mockWalletAddress,
          position_type: position,
          amount: amountValue
        });

      if (positionError) throw positionError;

      toast({
        title: "Position Opened",
        description: `You have successfully opened a ${position.toUpperCase()} position for ${amount} tokens`,
      });
      
      setAmount('');
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open position",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
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
        <Label htmlFor="amount">Amount</Label>
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
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing...' : 'Place Prediction'}
      </Button>
    </form>
  );
};
