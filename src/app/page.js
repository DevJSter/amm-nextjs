"use client";
import { useState, useEffect } from 'react';
import { ArrowDownUp, Plus, TrendingDown, TrendingUp, ChevronRight, Info, Settings } from 'lucide-react';
import { 
  AMM_FORMULAS, 
  AMM_CONFIGS, 
  initializePool, 
  calculateSwapOutput, 
  executeSwap, 
  getPoolPricing,
  calculateUSDValues,
  validateSwapAmount,
  addLiquidityToPool
} from './utility/fn.js';

export default function CPMMDEXSimulator() {
  const [step, setStep] = useState('pairs'); // 'pairs', 'tokens', 'liquidity', 'trading'
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AMM Formula Selection
  const [selectedFormula, setSelectedFormula] = useState(AMM_FORMULAS.CPMM);
  const [formulaConfig, setFormulaConfig] = useState({
    weightA: 0.5,
    weightB: 0.5,
    minPrice: 0.5,
    maxPrice: 2.0
  });
  
  // Token data
  const [tokenAData, setTokenAData] = useState(null);
  const [tokenBData, setTokenBData] = useState(null);
  const [popularPairs, setPopularPairs] = useState([]);
  
  // Liquidity pool state
  const [liquidityA, setLiquidityA] = useState('');
  const [liquidityB, setLiquidityB] = useState('');
  const [poolState, setPoolState] = useState(null);
  const [showAddLiquidity, setShowAddLiquidity] = useState(false);
  const [additionalLiquidityA, setAdditionalLiquidityA] = useState('');
  const [additionalLiquidityB, setAdditionalLiquidityB] = useState('');
  
  // Swap state
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('AtoB'); // 'AtoB' or 'BtoA'
  const [outputAmount, setOutputAmount] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [swapValidation, setSwapValidation] = useState({ isValid: true });

  // Popular trading pairs
 const mockPairs = [
  { tokenA: 'bitcoin', tokenB: 'ethereum', label: 'BTC/ETH' },
  { tokenA: 'ethereum', tokenB: 'cardano', label: 'ETH/ADA' },
  { tokenA: 'bitcoin', tokenB: 'solana', label: 'BTC/SOL' },
  { tokenA: 'ethereum', tokenB: 'polygon', label: 'ETH/MATIC' },
  { tokenA: 'cardano', tokenB: 'solana', label: 'ADA/SOL' },
  { tokenA: 'bitcoin', tokenB: 'chainlink', label: 'BTC/LINK' },
  { tokenA: 'ethereum', tokenB: 'avalanche-2', label: 'ETH/AVAX' },
  { tokenA: 'solana', tokenB: 'polygon', label: 'SOL/MATIC' },
  { tokenA: 'cardano', tokenB: 'chainlink', label: 'ADA/LINK' },
  { tokenA: 'bitcoin', tokenB: 'polkadot', label: 'BTC/DOT' },
  { tokenA: 'ethereum', tokenB: 'uniswap', label: 'ETH/UNI' },
  { tokenA: 'solana', tokenB: 'avalanche-2', label: 'SOL/AVAX' },
  { tokenA: 'litecoin', tokenB: 'bitcoin', label: 'LTC/BTC' },
  { tokenA: 'dogecoin', tokenB: 'ethereum', label: 'DOGE/ETH' },
  { tokenA: 'tron', tokenB: 'solana', label: 'TRX/SOL' },
  { tokenA: 'stellar', tokenB: 'ripple', label: 'XLM/XRP' },
  { tokenA: 'near', tokenB: 'ethereum', label: 'NEAR/ETH' },
  { tokenA: 'aptos', tokenB: 'bitcoin', label: 'APT/BTC' },
  { tokenA: 'optimism', tokenB: 'ethereum', label: 'OP/ETH' },
  { tokenA: 'arbitrum', tokenB: 'ethereum', label: 'ARB/ETH' },
  { tokenA: 'maker', tokenB: 'uniswap', label: 'MKR/UNI' },
  { tokenA: 'injective-protocol', tokenB: 'avalanche-2', label: 'INJ/AVAX' },
  { tokenA: 'vechain', tokenB: 'polygon', label: 'VET/MATIC' },
  { tokenA: 'algorand', tokenB: 'cardano', label: 'ALGO/ADA' },
  { tokenA: 'theta-token', tokenB: 'bitcoin', label: 'THETA/BTC' },
  { tokenA: 'the-graph', tokenB: 'ethereum', label: 'GRT/ETH' },
  { tokenA: 'tezos', tokenB: 'solana', label: 'XTZ/SOL' }
];


  // Fetch popular pairs data
  const fetchPopularPairs = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get unique token IDs
      const allTokens = [...new Set([
        ...mockPairs.map(p => p.tokenA),
        ...mockPairs.map(p => p.tokenB)
      ])];
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${allTokens.join(',')}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) throw new Error('Failed to fetch token data');
      
      const data = await response.json();
      
      // Build pairs with price data
      const pairsWithData = mockPairs.map(pair => {
        const tokenAData = data[pair.tokenA];
        const tokenBData = data[pair.tokenB];
        
        if (!tokenAData || !tokenBData) return null;
        
        return {
          ...pair,
          tokenAPrice: tokenAData.usd,
          tokenBPrice: tokenBData.usd,
          tokenAChange: tokenAData.usd_24h_change || 0,
          tokenBChange: tokenBData.usd_24h_change || 0,
          tokenAName: pair.tokenA.charAt(0).toUpperCase() + pair.tokenA.slice(1),
          tokenBName: pair.tokenB.charAt(0).toUpperCase() + pair.tokenB.slice(1)
        };
      }).filter(Boolean);
      
      setPopularPairs(pairsWithData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load popular pairs on component mount
  useEffect(() => {
    fetchPopularPairs();
  }, []);

  // Select a trading pair
  const selectPair = (pair) => {
    setTokenA(pair.tokenA);
    setTokenB(pair.tokenB);
    setTokenAData({
      id: pair.tokenA,
      name: pair.tokenAName,
      price: pair.tokenAPrice,
      change24h: pair.tokenAChange
    });
    setTokenBData({
      id: pair.tokenB,
      name: pair.tokenBName,
      price: pair.tokenBPrice,
      change24h: pair.tokenBChange
    });
    setStep('liquidity');
  };

  // Fetch token data from CoinGecko (for custom pairs)
  const fetchTokenData = async () => {
    if (!tokenA || !tokenB) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenA},${tokenB}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) throw new Error('Failed to fetch token data');
      
      const data = await response.json();
      
      if (!data[tokenA] || !data[tokenB]) {
        throw new Error('One or both tokens not found. Please check token IDs.');
      }
      
      setTokenAData({
        id: tokenA,
        name: tokenA.charAt(0).toUpperCase() + tokenA.slice(1),
        price: data[tokenA].usd,
        change24h: data[tokenA].usd_24h_change || 0
      });
      
      setTokenBData({
        id: tokenB,
        name: tokenB.charAt(0).toUpperCase() + tokenB.slice(1),
        price: data[tokenB].usd,
        change24h: data[tokenB].usd_24h_change || 0
      });
      
      setStep('liquidity');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add liquidity to pool
  const addLiquidity = () => {
    if (!liquidityA || !liquidityB || !tokenAData || !tokenBData) return;
    
    const amountA = parseFloat(liquidityA);
    const amountB = parseFloat(liquidityB);
    
    try {
      const newPoolState = initializePool(
        selectedFormula,
        amountA,
        amountB,
        tokenAData.price,
        tokenBData.price,
        formulaConfig
      );
      
      setPoolState(newPoolState);
      setStep('trading');
    } catch (error) {
      setError(error.message);
    }
  };

  // Add more liquidity to existing pool
  const addMoreLiquidity = () => {
    if (!additionalLiquidityA || !additionalLiquidityB || !poolState) return;
    
    const addAmountA = parseFloat(additionalLiquidityA);
    const addAmountB = parseFloat(additionalLiquidityB);
    
    try {
      const newPoolState = addLiquidityToPool(
        selectedFormula,
        addAmountA,
        addAmountB,
        poolState,
        { priceA: tokenAData.price, priceB: tokenBData.price }
      );
      
      setPoolState(newPoolState);
      setAdditionalLiquidityA('');
      setAdditionalLiquidityB('');
      setShowAddLiquidity(false);
    } catch (error) {
      setError(error.message);
    }
  };

  // Execute swap function with validation
  const handleExecuteSwap = () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0 || !poolState) return;
    
    // Validate swap first
    const validation = validateSwapAmount(
      selectedFormula,
      parseFloat(swapAmount),
      swapDirection,
      poolState,
      { priceA: tokenAData.price, priceB: tokenBData.price }
    );
    
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }
    
    try {
      const newPoolState = executeSwap(
        selectedFormula,
        parseFloat(swapAmount),
        swapDirection,
        poolState,
        { priceA: tokenAData.price, priceB: tokenBData.price }
      );
      
      setPoolState(newPoolState);
      setSwapAmount('');
      setOutputAmount(0);
      setPriceImpact(0);
      setError(''); // Clear any previous errors
    } catch (error) {
      setError(error.message);
    }
  };

  // Update swap preview when amount changes
  useEffect(() => {
    if (swapAmount && step === 'trading' && poolState) {
      try {
        // Validate the swap first
        const validation = validateSwapAmount(
          selectedFormula,
          parseFloat(swapAmount),
          swapDirection,
          poolState,
          { priceA: tokenAData.price, priceB: tokenBData.price }
        );
        
        setSwapValidation(validation);
        
        if (validation.isValid) {
          const result = calculateSwapOutput(
            selectedFormula,
            parseFloat(swapAmount),
            swapDirection,
            poolState,
            { priceA: tokenAData.price, priceB: tokenBData.price }
          );
          setOutputAmount(result.output);
          setPriceImpact(result.impact);
        } else {
          setOutputAmount(0);
          setPriceImpact(0);
        }
      } catch (error) {
        setOutputAmount(0);
        setPriceImpact(0);
        setSwapValidation({ isValid: false, error: error.message });
      }
    } else {
      setOutputAmount(0);
      setPriceImpact(0);
      setSwapValidation({ isValid: true });
    }
  }, [swapAmount, swapDirection, poolState, selectedFormula, step]);

  // Calculate current pool prices and USD values
  const getCurrentPoolPricing = () => {
    if (!poolState || !tokenAData || !tokenBData) return { priceA: 0, priceB: 0, usdValues: { reserveAUSD: 0, reserveBUSD: 0, totalLiquidityUSD: 0 } };
    
    const pricing = getPoolPricing(selectedFormula, poolState, {
      priceA: tokenAData.price,
      priceB: tokenBData.price
    });
    
    const usdValues = calculateUSDValues(poolState, {
      priceA: tokenAData.price,
      priceB: tokenBData.price
    });
    
    return { ...pricing, usdValues };
  };

  const currentPools = getCurrentPoolPricing();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Multi-AMM DEX Simulator</h1>
          <p className="text-gray-600">Compare Different Automated Market Maker Formulas</p>
        </div>

        {/* Step 0: Popular Trading Pairs */}
        {step === 'pairs' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-6 text-center text-black">Choose Trading Pair</h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading popular pairs...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
                {error}
              </div>
            )}
            
            {!loading && popularPairs.length > 0 && (
              <>
                <h3 className="text-lg font-medium mb-4 text-black">Popular Trading Pairs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {popularPairs.map((pair, index) => (
                    <div
                      key={index}
                      onClick={() => selectPair(pair)}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-all border border-gray-200 hover:border-blue-300"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg text-black">{pair.label}</h4>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{pair.tokenAName}:</span>
                          <span className="font-medium text-gray-900">${pair.tokenAPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{pair.tokenBName}:</span>
                          <span className="font-medium text-gray-900">${pair.tokenBPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className={`text-xs flex items-center ${pair.tokenAChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pair.tokenAChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {pair.tokenAChange.toFixed(1)}%
                          </span>
                          <span className={`text-xs flex items-center ${pair.tokenBChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pair.tokenBChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {pair.tokenBChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 text-black">Or Create Custom Pair</h3>
                  <button
                    onClick={() => setStep('tokens')}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Enter Custom Token IDs
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1: Custom Token Selection */}
        {step === 'tokens' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-black">Select Custom Trading Pair</h2>
              <button
                onClick={() => setStep('pairs')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Popular Pairs
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Token A (CoinGecko ID)
                </label>
                <input
                  type="text"
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value.toLowerCase())}
                  placeholder="e.g., bitcoin, ethereum"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Token B (CoinGecko ID)
                </label>
                <input
                  type="text"
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value.toLowerCase())}
                  placeholder="e.g., cardano, solana"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
                  {error}
                </div>
              )}
              <button
                onClick={fetchTokenData}
                disabled={!tokenA || !tokenB || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? 'Fetching Token Data...' : 'Fetch Token Prices'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AMM Formula Selection + Add Liquidity */}
        {step === 'liquidity' && tokenAData && tokenBData && (
          <div className="space-y-6">
            {/* AMM Formula Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">Select AMM Formula</h2>
                <button
                  onClick={() => {
                    setStep('pairs');
                    setTokenAData(null);
                    setTokenBData(null);
                    setTokenA('');
                    setTokenB('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Change Pair
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(AMM_CONFIGS).map(([key, config]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedFormula(key)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFormula === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      <Info className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{config.description}</p>
                    <div className="text-xs space-y-1 text-gray-600">
                      <div><strong className="text-gray-800">Formula:</strong> {config.formula}</div>
                      <div><strong className="text-gray-800">Best for:</strong> {config.bestFor}</div>
                      <div><strong className="text-gray-800">Slippage:</strong> {config.slippage}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formula-specific configurations */}
              {selectedFormula === AMM_FORMULAS.CONSTANT_MEAN && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-black mb-3">Balancer Weights Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {tokenAData.name} Weight
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={formulaConfig.weightA}
                        onChange={(e) => setFormulaConfig({
                          ...formulaConfig,
                          weightA: parseFloat(e.target.value),
                          weightB: 1 - parseFloat(e.target.value)
                        })}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        {tokenBData.name} Weight
                      </label>
                      <input
                        type="number"
                        value={formulaConfig.weightB}
                        readOnly
                        className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedFormula === AMM_FORMULAS.CONCENTRATED && (
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-black mb-3">Concentrated Liquidity Range</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Min Price Ratio
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={formulaConfig.minPrice}
                        onChange={(e) => setFormulaConfig({
                          ...formulaConfig,
                          minPrice: parseFloat(e.target.value)
                        })}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Max Price Ratio
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={formulaConfig.maxPrice}
                        onChange={(e) => setFormulaConfig({
                          ...formulaConfig,
                          maxPrice: parseFloat(e.target.value)
                        })}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add Liquidity Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6 text-black">Add Initial Liquidity</h2>
              
              {/* Token Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-black">{tokenAData.name}</h3>
                  <p className="text-2xl font-bold text-blue-600">${tokenAData.price.toFixed(4)}</p>
                  <p className={`text-sm flex items-center ${tokenAData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tokenAData.change24h >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {tokenAData.change24h.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-black">{tokenBData.name}</h3>
                  <p className="text-2xl font-bold text-purple-600">${tokenBData.price.toFixed(4)}</p>
                  <p className={`text-sm flex items-center ${tokenBData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tokenBData.change24h >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {tokenBData.change24h.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Current Formula Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <Settings className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="font-medium text-black">Selected Formula: {AMM_CONFIGS[selectedFormula].name}</span>
                </div>
                <p className="text-sm text-gray-600">{AMM_CONFIGS[selectedFormula].description}</p>
              </div>

              {/* Liquidity Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {tokenAData.name} Amount
                  </label>
                  <input
                    type="number"
                    value={liquidityA}
                    onChange={(e) => setLiquidityA(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                  {liquidityA && (
                    <p className="text-sm text-gray-500 mt-1">
                      Value: ${(parseFloat(liquidityA) * tokenAData.price).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {tokenBData.name} Amount
                  </label>
                  <input
                    type="number"
                    value={liquidityB}
                    onChange={(e) => setLiquidityB(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                  {liquidityB && (
                    <p className="text-sm text-gray-500 mt-1">
                      Value: ${(parseFloat(liquidityB) * tokenBData.price).toFixed(2)}
                    </p>
                  )}
                </div>
                <button
                  onClick={addLiquidity}
                  disabled={!liquidityA || !liquidityB}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Liquidity with {AMM_CONFIGS[selectedFormula].name}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Trading Interface */}
        {step === 'trading' && poolState && (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="bg-white rounded-lg p-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Trading: <span className="font-semibold text-black">{tokenAData.name}/{tokenBData.name}</span>
                <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {AMM_CONFIGS[selectedFormula].name}
                </span>
              </div>
              <button
                onClick={() => {
                  setStep('pairs');
                  setTokenAData(null);
                  setTokenBData(null);
                  setTokenA('');
                  setTokenB('');
                  setLiquidityA('');
                  setLiquidityB('');
                  setPoolState(null);
                  setSwapAmount('');
                  setOutputAmount(0);
                  setPriceImpact(0);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                ← Change Pair
              </button>
            </div>

            {/* Pool Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Pool Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Formula</h3>
                  <p className="text-lg font-bold text-gray-900">{AMM_CONFIGS[selectedFormula].name}</p>
                </div>
                {selectedFormula === AMM_FORMULAS.CPMM && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">Constant K</h3>
                    <p className="text-xl font-bold text-gray-900">{poolState.constantK?.toFixed(2)}</p>
                  </div>
                )}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Total Liquidity</h3>
                  <p className="text-xl font-bold text-green-600">${currentPools.usdValues?.totalLiquidityUSD?.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <button
                    onClick={() => setShowAddLiquidity(!showAddLiquidity)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add More Liquidity
                  </button>
                </div>
              </div>
              
              {/* Add More Liquidity Section */}
              {showAddLiquidity && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-black mb-3">Add More Liquidity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Additional {tokenAData.name}
                      </label>
                      <input
                        type="number"
                        value={additionalLiquidityA}
                        onChange={(e) => setAdditionalLiquidityA(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Additional {tokenBData.name}
                      </label>
                      <input
                        type="number"
                        value={additionalLiquidityB}
                        onChange={(e) => setAdditionalLiquidityB(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={addMoreLiquidity}
                      disabled={!additionalLiquidityA || !additionalLiquidityB}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      Add Liquidity
                    </button>
                    <button
                      onClick={() => setShowAddLiquidity(false)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Reserve Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{tokenAData.name} Reserve</h3>
                  <p className="text-xl font-bold text-blue-600">{poolState.reserveA?.toFixed(4)} {tokenAData.name}</p>
                  <p className="text-sm text-gray-600">${currentPools.usdValues?.reserveAUSD?.toFixed(2)} USD</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{tokenBData.name} Reserve</h3>
                  <p className="text-xl font-bold text-purple-600">{poolState.reserveB?.toFixed(4)} {tokenBData.name}</p>
                  <p className="text-sm text-gray-600">${currentPools.usdValues?.reserveBUSD?.toFixed(2)} USD</p>
                </div>
              </div>
            </div>

            {/* Price Comparison */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Price Comparison & Pool Composition</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-black mb-3">{tokenAData.name} Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-900">CoinGecko Price:</span>
                      <span className="font-semibold text-gray-900">${tokenAData.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900">Current Pool Price:</span>
                      <span className="font-semibold text-gray-900">${currentPools.priceA.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900">Price Difference:</span>
                      <span className={`font-semibold ${currentPools.priceA > tokenAData.price ? 'text-green-600' : 'text-red-600'}`}>
                        {((currentPools.priceA - tokenAData.price) / tokenAData.price * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900">Pool Amount:</span>
                        <span className="font-semibold text-blue-600">{poolState.reserveA?.toFixed(4)} {tokenAData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900">USD Value:</span>
                        <span className="font-semibold text-gray-900">${currentPools.usdValues?.reserveAUSD?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900">Pool Share:</span>
                        <span className="font-semibold text-gray-900">
                          {((currentPools.usdValues?.reserveAUSD / currentPools.usdValues?.totalLiquidityUSD) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-3">{tokenBData.name} Analysis</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-900">CoinGecko Price:</span>
                      <span className="font-semibold text-gray-900">${tokenBData.price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900">Current Pool Price:</span>
                      <span className="font-semibold text-gray-900">${currentPools.priceB.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900">Price Difference:</span>
                      <span className={`font-semibold ${currentPools.priceB > tokenBData.price ? 'text-green-600' : 'text-red-600'}`}>
                        {((currentPools.priceB - tokenBData.price) / tokenBData.price * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900">Pool Amount:</span>
                        <span className="font-semibold text-purple-600">{poolState.reserveB?.toFixed(4)} {tokenBData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900">USD Value:</span>
                        <span className="font-semibold text-gray-900">${currentPools.usdValues?.reserveBUSD?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-900">Pool Share:</span>
                        <span className="font-semibold text-gray-900">
                          {((currentPools.usdValues?.reserveBUSD / currentPools.usdValues?.totalLiquidityUSD) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Interface */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Swap Tokens</h2>
              
              {/* Direction Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 rounded-lg p-1 flex">
                  <button
                    onClick={() => setSwapDirection('AtoB')}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      swapDirection === 'AtoB' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-900 hover:text-gray-700'
                    }`}
                  >
                    {tokenAData.name} → {tokenBData.name}
                  </button>
                  <button
                    onClick={() => setSwapDirection('BtoA')}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      swapDirection === 'BtoA' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-900 hover:text-gray-700'
                    }`}
                  >
                    {tokenBData.name} → {tokenAData.name}
                  </button>
                </div>
              </div>

              {/* Swap Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Swap Amount ({swapDirection === 'AtoB' ? tokenAData.name : tokenBData.name})
                  </label>
                  <input
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* Swap Preview */}
                {swapAmount && !swapValidation.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-red-700">
                      <span className="font-semibold">⚠️ Invalid Swap</span>
                    </div>
                    <p className="text-red-700 text-sm">{swapValidation.error}</p>
                    {swapValidation.maxInput && (
                      <div className="mt-2">
                        <p className="text-red-700 text-sm">
                          Maximum safe amount: {swapValidation.maxInput.toFixed(6)} {swapDirection === 'AtoB' ? tokenAData.name : tokenBData.name}
                        </p>
                        <button
                          onClick={() => setSwapAmount(swapValidation.maxInput.toFixed(6))}
                          className="mt-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                        >
                          Use Max Amount
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {swapAmount && outputAmount > 0 && swapValidation.isValid && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">You&apos;ll receive:</span>
                      <span className="font-semibold text-lg text-gray-900">
                        {outputAmount.toFixed(6)} {swapDirection === 'AtoB' ? tokenBData.name : tokenAData.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">USD Value:</span>
                      <span className="font-semibold text-gray-900">
                        ${(outputAmount * (swapDirection === 'AtoB' ? tokenBData.price : tokenAData.price)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">Price Impact:</span>
                      <span className={`font-semibold ${Math.abs(priceImpact) > 5 ? 'text-red-600' : Math.abs(priceImpact) > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">Formula:</span>
                      <span className="font-medium text-gray-900">{AMM_CONFIGS[selectedFormula].name}</span>
                    </div>
                    {Math.abs(priceImpact) > 5 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                        <p className="text-yellow-800 text-xs">⚠️ High price impact! Consider a smaller trade size.</p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleExecuteSwap}
                  disabled={!swapAmount || parseFloat(swapAmount) <= 0 || !swapValidation.isValid}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center"
                >
                  <ArrowDownUp className="w-5 h-5 mr-2" />
                  {!swapValidation.isValid ? 'Invalid Swap' : 'Execute Swap'}
                </button>
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setStep('pairs');
                  setTokenA('');
                  setTokenB('');
                  setTokenAData(null);
                  setTokenBData(null);
                  setLiquidityA('');
                  setLiquidityB('');
                  setPoolState(null);
                  setSwapAmount('');
                  setOutputAmount(0);
                  setPriceImpact(0);
                  setSelectedFormula(AMM_FORMULAS.CPMM);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}