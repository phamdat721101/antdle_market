
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createCampaignOnChain } from '@/utils/contractHelpers';
import { ethers } from 'ethers';

export const CreateMarketForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [assetName, setAssetName] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useOnChain, setUseOnChain] = useState(false);
  const { toast } = useToast();

  const createOffChainMarket = async () => {
    try {
      const expiryTimestamp = new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase.from('prediction_markets').insert({
        asset_name: assetName,
        strike_price: parseFloat(strikePrice),
        expiry_timestamp: expiryTimestamp,
        description: description || null,
        status: 'active',
      });

      if (error) throw error;

      toast({
        title: "Market Created",
        description: "Your prediction market has been created successfully",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create market",
        variant: "destructive",
      });
      return false;
    }
  };

  const createOnChainMarket = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to create on-chain markets.");
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please connect your wallet.");
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Generate description from asset name and strike price if not provided
      const marketDescription = description || 
        `Will ${assetName} price exceed $${strikePrice} at expiry?`;
      
      // Create campaign on-chain
      const campaignId = await createCampaignOnChain(
        signer,
        marketDescription,
        parseInt(expiryHours)
      );
      
      // Also store in Supabase for UI purposes
      const expiryTimestamp = new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase.from('prediction_markets').insert({
        asset_name: assetName,
        strike_price: parseFloat(strikePrice),
        expiry_timestamp: expiryTimestamp,
        description: marketDescription,
        status: 'active',
        on_chain_id: campaignId, // Store the on-chain ID
        creator_address: accounts[0],
      });

      if (error) throw error;

      toast({
        title: "On-Chain Market Created",
        description: `Your prediction market has been created successfully with campaign ID: ${campaignId}`,
      });
      return true;
    } catch (error: any) {
      console.error("Error creating on-chain market:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create on-chain market",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !strikePrice || !expiryHours) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let success;
      
      if (useOnChain) {
        success = await createOnChainMarket();
      } else {
        success = await createOffChainMarket();
      }
      
      if (success) {
        setAssetName('');
        setStrikePrice('');
        setExpiryHours('24');
        setDescription('');
        setUseOnChain(false);
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create market",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Asset Name</label>
        <Input
          placeholder="ETH"
          value={assetName}
          onChange={(e) => setAssetName(e.target.value)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Strike Price ($)</label>
        <Input
          placeholder="2000"
          type="number"
          step="0.01"
          min="0"
          value={strikePrice}
          onChange={(e) => setStrikePrice(e.target.value)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Expiry (Hours from now)</label>
        <Input
          placeholder="24"
          type="number"
          min="1"
          value={expiryHours}
          onChange={(e) => setExpiryHours(e.target.value)}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
        <Textarea
          placeholder="Will ETH price be higher than $2000 at expiry?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch 
          id="use-on-chain" 
          checked={useOnChain} 
          onCheckedChange={setUseOnChain}
        />
        <Label htmlFor="use-on-chain">Create market on blockchain</Label>
      </div>
      
      {useOnChain && (
        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
          <p className="text-sm text-amber-800">
            Creating a market on-chain requires a connected wallet and will initiate a blockchain transaction. 
            Gas fees will apply.
          </p>
        </div>
      )}
      
      <Button 
        type="submit" 
        className={`w-full ${useOnChain ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'}`}
        disabled={isSubmitting}
      >
        {isSubmitting 
          ? 'Creating...' 
          : useOnChain 
            ? 'Create On-Chain Market' 
            : 'Create Market'
        }
      </Button>
    </form>
  );
};
