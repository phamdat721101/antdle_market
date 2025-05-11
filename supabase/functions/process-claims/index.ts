
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const authHeader = req.headers.get('Authorization');
  
  // This would be secured with proper auth in production
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get pending claims
    const { data: pendingClaims, error: fetchError } = await supabase
      .from('claims')
      .select('*')
      .eq('status', 'pending')
      .limit(10); // Process in batches
    
    if (fetchError) {
      throw new Error(`Error fetching claims: ${fetchError.message}`);
    }
    
    console.log(`Processing ${pendingClaims?.length || 0} pending claims`);
    
    // Process each claim
    // In a real implementation, this would interact with the blockchain
    // to transfer tokens to wallets
    const results = [];
    
    for (const claim of pendingClaims || []) {
      try {
        // Simulate blockchain interaction
        // In a real implementation, you would:
        // 1. Connect to a blockchain provider
        // 2. Execute the token transfer transaction
        // 3. Wait for transaction confirmation
        
        console.log(`Processing claim for ${claim.email} to wallet ${claim.wallet}`);
        
        // For demo purposes, we'll just mark it as sent
        const { error: updateError } = await supabase
          .from('claims')
          .update({
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', claim.id);
          
        if (updateError) {
          throw new Error(`Error updating claim ${claim.id}: ${updateError.message}`);
        }
        
        results.push({ id: claim.id, success: true });
      } catch (claimError: any) {
        console.error(`Error processing claim ${claim.id}:`, claimError);
        
        // Mark as failed
        await supabase
          .from('claims')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', claim.id);
          
        results.push({ id: claim.id, success: false, error: claimError.message });
      }
    }
    
    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error: any) {
    console.error("Error processing claims:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
