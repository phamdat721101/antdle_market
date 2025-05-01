
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CreateMarketForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [assetName, setAssetName] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
      setAssetName('');
      setStrikePrice('');
      setExpiryHours('24');
      setDescription('');
      onSuccess();
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
      
      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating...' : 'Create Market'}
      </Button>
    </form>
  );
};
