
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

interface ClaimStatusProps {
  email: string;
}

interface Claim {
  id: number;
  email: string;
  wallet: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  updated_at: string;
}

export const ClaimStatus = ({ email }: ClaimStatusProps) => {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    const fetchClaimStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('claims')
          .select('*')
          .eq('email', email)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // No rows returned
            throw error;
          }
        } else {
          setClaim(data as Claim);
        }
      } catch (err: any) {
        toast.error(`Failed to check claim status: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchClaimStatus();
  }, [email]);

  if (loading) {
    return <div className="p-4 text-center">Loading claim status...</div>;
  }

  if (!claim) {
    return null; // No claim found
  }

  const getStatusBadge = () => {
    switch (claim.status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'sent':
        return <Badge className="bg-green-500">Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Leo Token Claim</CardTitle>
        <CardDescription>Current status of your Leo token claim</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">Status:</span>
            {getStatusBadge()}
          </div>
          <div>
            <span className="font-medium">Wallet:</span>
            <span className="ml-2 text-sm">{claim.wallet}</span>
          </div>
          <div>
            <span className="font-medium">Requested:</span>
            <span className="ml-2 text-sm">
              {new Date(claim.created_at).toLocaleDateString()} at {new Date(claim.created_at).toLocaleTimeString()}
            </span>
          </div>
          {claim.status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Your Leo tokens will be sent to your wallet soon. This process typically takes 1-24 hours.
            </p>
          )}
          {claim.status === 'sent' && (
            <p className="text-sm text-green-600">
              Your Leo tokens have been sent to your wallet. Check your wallet balance!
            </p>
          )}
          {claim.status === 'failed' && (
            <p className="text-sm text-red-600">
              There was an issue sending your tokens. Please contact support.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
