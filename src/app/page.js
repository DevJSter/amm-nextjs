"use client";
import { useState, useEffect } from 'react';
import { ArrowDownUp, Plus, TrendingDown, TrendingUp, ChevronRight } from 'lucide-react';

export default function CPMMDEXSimulator() {
  const [step, setStep] = useState('pairs'); // 'pairs', 'tokens', 'liquidity', 'trading'
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Token data
  const [tokenAData, setTokenAData] = useState(null);
  const [tokenBData, setTokenBData] = useState(null);
  const [popularPairs, setPopularPairs] = useState([]);
  
  // Liquidity pool state
  const [liquidityA, setLiquidityA] = useState('');
  const [liquidityB, setLiquidityB] = useState('');
  const [reserveA, setReserveA] = useState(0);
  const [reserveB, setReserveB] = useState(0);
  const [constantK, setConstantK] = useState(0);
  
  // Swap state
  const [swapAmount, setSwapAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState('AtoB'); // 'AtoB' or 'BtoA'
  const [outputAmount, setOutputAmount] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);

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
    
    const reserveAValue = amountA * tokenAData.price;
    const reserveBValue = amountB * tokenBData.price;
    
    setReserveA(amountA);
    setReserveB(amountB);
    setConstantK(amountA * amountB);
    setStep('trading');
  };

  // Calculate swap output using CPMM formula
  const calculateSwapOutput = (inputAmount, direction) => {
    if (!inputAmount || !reserveA || !reserveB) return { output: 0, impact: 0 };
    
    const input = parseFloat(inputAmount);
    
    let newReserveIn, newReserveOut, reserveIn, reserveOut, priceIn, priceOut;
    
    if (direction === 'AtoB') {
      reserveIn = reserveA;
      reserveOut = reserveB;
      priceIn = tokenAData.price;
      priceOut = tokenBData.price;
      newReserveIn = reserveIn + input;
      newReserveOut = constantK / newReserveIn;
    } else {
      reserveIn = reserveB;
      reserveOut = reserveA;
      priceIn = tokenBData.price;
      priceOut = tokenAData.price;
      newReserveIn = reserveIn + input;
      newReserveOut = constantK / newReserveIn;
    }
    
    const output = reserveOut - newReserveOut;
    
    // Calculate price impact
    const oldPrice = (reserveIn * priceIn) / (reserveOut * priceOut);
    const newPrice = (newReserveIn * priceIn) / (newReserveOut * priceOut);
    const impact = ((newPrice - oldPrice) / oldPrice) * 100;
    
    return { output, impact };
  };

  // Execute swap
  const executeSwap = () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) return;
    
    const input = parseFloat(swapAmount);
    const { output } = calculateSwapOutput(swapAmount, swapDirection);
    
    if (swapDirection === 'AtoB') {
      const newReserveA = reserveA + input;
      const newReserveB = constantK / newReserveA;
      setReserveA(newReserveA);
      setReserveB(newReserveB);
    } else {
      const newReserveB = reserveB + input;
      const newReserveA = constantK / newReserveB;
      setReserveA(newReserveA);
      setReserveB(newReserveB);
    }
    
    setSwapAmount('');
    setOutputAmount(0);
    setPriceImpact(0);
  };

  // Update swap preview when amount changes
  useEffect(() => {
    if (swapAmount && step === 'trading') {
      const { output, impact } = calculateSwapOutput(swapAmount, swapDirection);
      setOutputAmount(output);
      setPriceImpact(impact);
    } else {
      setOutputAmount(0);
      setPriceImpact(0);
    }
  }, [swapAmount, swapDirection, reserveA, reserveB, constantK]);

  // Calculate current pool prices
  const getCurrentPoolPrice = () => {
    if (!reserveA || !reserveB || !tokenAData || !tokenBData) return { priceA: 0, priceB: 0 };
    
    const totalValueA = reserveA * tokenAData.price;
    const totalValueB = reserveB * tokenBData.price;
    const totalValue = totalValueA + totalValueB;
    
    return {
      priceA: totalValue / (2 * reserveA),
      priceB: totalValue / (2 * reserveB)
    };
  };

  const currentPools = getCurrentPoolPrice();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CPMM DEX Simulator</h1>
          <p className="text-gray-600">Constant Product Market Maker with Real Token Prices</p>
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

        {/* Step 2: Add Liquidity */}
        {step === 'liquidity' && tokenAData && tokenBData && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-black">Add Initial Liquidity</h2>
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
                Add Liquidity
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Trading Interface */}
        {step === 'trading' && (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="bg-white rounded-lg p-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Trading: <span className="font-semibold text-black">{tokenAData.name}/{tokenBData.name}</span>
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
                  setReserveA(0);
                  setReserveB(0);
                  setConstantK(0);
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">Constant K</h3>
                  <p className="text-xl font-bold text-gray-900">{constantK.toFixed(2)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{tokenAData.name} Reserve</h3>
                  <p className="text-xl font-bold text-blue-600">{reserveA.toFixed(4)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{tokenBData.name} Reserve</h3>
                  <p className="text-xl font-bold text-purple-600">{reserveB.toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* Price Comparison */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Price Comparison</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-black mb-3">{tokenAData.name}</h3>
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
                      <span className="text-gray-900">Difference:</span>
                      <span className={`font-semibold ${currentPools.priceA > tokenAData.price ? 'text-green-600' : 'text-red-600'}`}>
                        {((currentPools.priceA - tokenAData.price) / tokenAData.price * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-black mb-3">{tokenBData.name}</h3>
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
                      <span className="text-gray-900">Difference:</span>
                      <span className={`font-semibold ${currentPools.priceB > tokenBData.price ? 'text-green-600' : 'text-red-600'}`}>
                        {((currentPools.priceB - tokenBData.price) / tokenBData.price * 100).toFixed(2)}%
                      </span>
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
                {swapAmount && outputAmount > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">Youll receive:</span>
                      <span className="font-semibold text-lg text-gray-900">
                        {outputAmount.toFixed(6)} {swapDirection === 'AtoB' ? tokenBData.name : tokenAData.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900">Price Impact:</span>
                      <span className={`font-semibold ${priceImpact > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={executeSwap}
                  disabled={!swapAmount || parseFloat(swapAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center"
                >
                  <ArrowDownUp className="w-5 h-5 mr-2" />
                  Execute Swap
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
                  setReserveA(0);
                  setReserveB(0);
                  setConstantK(0);
                  setSwapAmount('');
                  setOutputAmount(0);
                  setPriceImpact(0);
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