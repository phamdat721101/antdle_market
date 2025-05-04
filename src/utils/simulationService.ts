// simulationService.ts
import { faker } from '@faker-js/faker';
import { supabase } from '@/integrations/supabase/client';
import { TransactionStatusResult, TransactionDetails } from './typeHelpers';

const generateRandomMarketData = () => {
  const assetName = faker.finance.currencyName();
  const strikePrice = parseFloat(faker.finance.amount(10, 200, 2));
  const expiryTimestamp = faker.date.future().toISOString();
  const yesPool = parseFloat(faker.finance.amount(100, 1000, 2));
  const noPool = parseFloat(faker.finance.amount(100, 1000, 2));
  const status = faker.helpers.arrayElement(['active', 'settled']);
  const description = faker.lorem.sentence();

  return {
    asset_name: assetName,
    strike_price: strikePrice,
    expiry_timestamp: expiryTimestamp,
    yes_pool: yesPool,
    no_pool: noPool,
    status: status,
    description: description,
  };
};

const simulateMarketCreation = async (): Promise<TransactionStatusResult> => {
  try {
    const marketData = generateRandomMarketData();
    const { data, error } = await supabase
      .from('prediction_markets')
      .insert([marketData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return { status: 'failed', details: { error: error.message } };
    }

    return { status: 'success', details: { marketId: data.id, ...marketData } };
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateTrade = async (marketId: string, isYes: boolean, amount: number): Promise<TransactionStatusResult> => {
  try {
    // Fetch the current market data
    const { data: marketData, error: marketError } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError) {
      console.error("Error fetching market:", marketError);
      return { status: 'failed', details: { error: marketError.message } };
    }

    if (!marketData) {
      return { status: 'failed', details: { error: 'Market not found' } };
    }

    // Simulate the trade by updating the pool values
    const updatedYesPool = isYes ? marketData.yes_pool + amount : marketData.yes_pool;
    const updatedNoPool = !isYes ? marketData.no_pool + amount : marketData.no_pool;

    // Update the market in Supabase
    const { error: updateError } = await supabase
      .from('prediction_markets')
      .update({ yes_pool: updatedYesPool, no_pool: updatedNoPool })
      .eq('id', marketId);

    if (updateError) {
      console.error("Error updating market:", updateError);
      return { status: 'failed', details: { error: updateError.message } };
    }

    return { status: 'success', details: { marketId, isYes, amount, updatedYesPool, updatedNoPool } };
  } catch (error: any) {
    console.error("Trade simulation error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateMarketSettlement = async (marketId: string, settlementValue: boolean): Promise<TransactionStatusResult> => {
  try {
    // Fetch the market data
    const { data: marketData, error: marketError } = await supabase
      .from('prediction_markets')
      .select('*')
      .eq('id', marketId)
      .single();

    if (marketError) {
      console.error("Error fetching market:", marketError);
      return { status: 'failed', details: { error: marketError.message } };
    }

    if (!marketData) {
      return { status: 'failed', details: { error: 'Market not found' } };
    }

    // Simulate settlement by updating the market status
    const { error: updateError } = await supabase
      .from('prediction_markets')
      .update({ status: 'settled', settlement_value: settlementValue })
      .eq('id', marketId);

    if (updateError) {
      console.error("Error settling market:", updateError);
      return { status: 'failed', details: { error: updateError.message } };
    }

    return { status: 'success', details: { marketId, settlementValue } };
  } catch (error: any) {
    console.error("Market settlement error:", error);
    return { status: 'failed', details: { error: error.message } };
  }
};

const simulateTransaction = async (action: string, details: any): Promise<TransactionStatusResult> => {
  const transactionDetails: TransactionDetails = {
    hash: faker.string.alphanumeric(42),
    from: faker.finance.ethereumAddress(),
    to: faker.finance.ethereumAddress(),
    value: faker.finance.amount(0.001, 1, 10),
    gasUsed: faker.finance.amount(21000, 100000, 0),
    blockNumber: faker.number.int({ min: 1000000, max: 2000000 }),
    timestamp: faker.date.recent().toISOString(),
    action,
    details,
  };

  // Simulate different transaction outcomes
  const outcome = faker.helpers.arrayElement(['success', 'failed', 'pending']);

  switch (outcome) {
    case 'success':
      return { status: 'success', details: transactionDetails };
    case 'failed':
      return { status: 'failed', details: { ...transactionDetails, error: faker.lorem.sentence() } };
    case 'pending':
      return { status: 'pending', details: transactionDetails };
    default:
      return { status: 'unknown', details: { message: 'Unexpected simulation outcome.' } };
  }
};

export const SimulationService = {
  simulateMarketCreation,
  simulateTrade,
  simulateMarketSettlement,
  simulateTransaction,
};
