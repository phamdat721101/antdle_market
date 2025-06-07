
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAddressValid } from '@/utils/contractHelpers';

export const ClaimAntModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    walletAddress: ''
  });

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: '', walletAddress: '' };

    // Simple email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      valid = false;
    }

    // Wallet address validation
    if (!walletAddress || !isAddressValid(walletAddress)) {
      newErrors.walletAddress = 'Please enter a valid Ethereum wallet address';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('claims')
        .insert([{
          email,
          wallet: walletAddress,
          status: 'pending'
        }]);
        
      if (error) {
        if (error.code === '23505') { // Unique violation
          if (error.message.includes('email')) {
            toast.error("This email has already registered for ANT tokens");
          } else if (error.message.includes('wallet')) {
            toast.error("This wallet address has already registered for ANT tokens");
          } else {
            toast.error("This email or wallet has already been registered");
          }
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.success("Success! You will receive your ANT tokens soon", {
          description: "We'll process your claim shortly"
        });
        setIsOpen(false);
        setEmail('');
        setWalletAddress('');
      }
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="text-white bg-orange-600 hover:bg-orange-700">
          Claim ANT
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Claim Your ANT Tokens</DialogTitle>
          <DialogDescription>
            Enter your information below to receive free ANT tokens for trading.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet">Ethereum Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className={errors.walletAddress ? "border-red-500" : ""}
            />
            {errors.walletAddress && <p className="text-red-500 text-sm">{errors.walletAddress}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Submit Claim'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
