import React, { useState, useEffect, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const LOG2 = Math.log(2);
const LOG3 = Math.log(3);

// Compute powers of 2 and 3 in n(n+1) using only BigInt
function extract23Powers(n) {
  let num = BigInt(n);
  const nPlus1 = num + 1n;
  let product = num * nPlus1;
  
  let pow2 = 0;
  let pow3 = 0;
  
  while (product % 2n === 0n) {
    pow2++;
    product = product / 2n;
  }
  
  while (product % 3n === 0n) {
    pow3++;
    product = product / 3n;
  }
  
  return { pow2, pow3, remainder: product };
}

// Compute log(R(n)) = k*log(2) + l*log(3) - log(n) - log(log(n))
function computeLogRatio(n) {
  const { pow2, pow3, remainder } = extract23Powers(n);
  
  const nNum = Number(n);
  const logN = Math.log(nNum);
  const logLogN = Math.log(logN);
  
  const logRn = pow2 * LOG2 + pow3 * LOG3 - logN - logLogN;
  
  return {
    n: nNum,
    pow2,
    pow3,
    remainder,
    logRn,
    ratio: Math.exp(logRn)
  };
}

// Generate strategic candidates optimized for large n
function* generateCandidates(maxN, density = 'medium') {
  const maxNBig = BigInt(maxN);
  const candidates = new Set();
  
  // Helper to add if in range
  const tryAdd = (n) => {
    if (n >= 2n && n <= maxNBig && !candidates.has(n)) {
      candidates.add(n);
      return true;
    }
    return false;
  };
  
  // 1. Powers of 2 minus 1 (n+1 = 2^k)
  for (let k = 2; k <= 200; k++) {
    const pow = 2n ** BigInt(k);
    if (pow > maxNBig) break;
    tryAdd(pow - 1n);
  }
  
  // 2. Powers of 3 minus 1
  for (let k = 2; k <= 130; k++) {
    const pow = 3n ** BigInt(k);
    if (pow > maxNBig) break;
    tryAdd(pow - 1n);
  }
  
  // 3. 2^a * 3^b - 1 (highly smooth n+1)
  for (let a = 1; a <= 100; a++) {
    const pow2 = 2n ** BigInt(a);
    if (pow2 > maxNBig) break;
    
    for (let b = 1; b <= 80; b++) {
      const product = pow2 * (3n ** BigInt(b));
      if (product > maxNBig) break;
      tryAdd(product - 1n);
      tryAdd(product + 1n);
    }
  }
  
  // 4. Dense sampling around powers of 2
  const densityMap = { low: 50, medium: 200, high: 500 };
  const radius = densityMap[density] || 200;
  
  for (let k = 10; k <= 200; k++) {
    const center = 2n ** BigInt(k);
    if (center > maxNBig) break;
    
    for (let offset = -radius; offset <= radius; offset++) {
      tryAdd(center + BigInt(offset));
    }
  }
  
  // 5. Dense sampling around powers of 3
  for (let k = 6; k <= 130; k++) {
    const center = 3n ** BigInt(k);
    if (center > maxNBig) break;
    
    for (let offset = -radius; offset <= radius; offset++) {
      tryAdd(center + BigInt(offset));
    }
  }
  
  // 6. Sparse linear sampling
  const step = density === 'high' ? 1000 : density === 'medium' ? 10000 : 100000;
  for (let n = 2; n <= maxN; n += step) {
    tryAdd(BigInt(n));
  }
  
  // Convert to sorted array and yield
  const sorted = Array.from(candidates).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  
  for (const n of sorted) {
    yield n;
  }
}

function SmoothRatioExplorer() {
  const [maxNInput, setMaxNInput] = useState('1000000');
  const [density, setDensity] = useState('medium');
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentN, setCurrentN] = useState(null);
  const [spikes, setSpikes] = useState([]);
  const [allData, setAllData] = useState([]);
  const [stats, setStats] = useState(null);
  const [autoTrackSpikes, setAutoTrackSpikes] = useState(true);
  const abortRef = useRef(false);
  
  const computeData = async () => {
    const maxN = parseInt(maxNInput.replace(/,/g, ''));
    if (!maxN || maxN < 2) return;
    
    setComputing(true);
    setProgress(0);
    setSpikes([]);
    setAllData([]);
    setStats(null);
    abortRef.current = false;
    
    const results = [];
    const spikeResults = [];
    let maxLogRn = -Infinity;
    let processed = 0;
    let totalEstimate = 0;
    
    // Estimate total candidates
    const generator = generateCandidates(maxN, density);
    const tempCandidates = [];
    for (const n of generator) {
      tempCandidates.push(n);
      if (tempCandidates.length > 50000) break; // Cap for estimation
    }
    totalEstimate = tempCandidates.length;
    
    // Process in batches
    const batchSize = 500;
    const candidateGen = generateCandidates(maxN, density);
    let batch = [];
    
    for (const n of candidateGen) {
      if (abortRef.current) break;
      
      batch.push(n);
      
      if (batch.length >= batchSize) {
        await new Promise(resolve => setTimeout(resolve, 0));
        
        for (const candidate of batch) {
          try {
            const result = computeLogRatio(candidate);
            
            if (isFinite(result.logRn)) {
              results.push(result);
              
              // Track spikes automatically
              if (autoTrackSpikes && result.logRn > maxLogRn) {
                maxLogRn = result.logRn;
                spikeResults.push(result);
              }
              
              processed++;
              
              if (processed % 100 === 0) {
                setCurrentN(result.n);
                setProgress(Math.min(99, Math.floor(100 * processed / Math.max(totalEstimate, processed))));
              }
            }
          } catch (e) {
            console.error('Error computing n =', candidate, e);
          }
        }
        
        batch = [];
      }
    }
    
    // Process remaining batch
    for (const candidate of batch) {
      if (abortRef.current) break;
      try {
        const result = computeLogRatio(candidate);
        if (isFinite(result.logRn)) {
          results.push(result);
          if (autoTrackSpikes && result.logRn > maxLogRn) {
            maxLogRn = result.logRn;
            spikeResults.push(result);
          }
        }
      } catch (e) {
        console.error('Error computing n =', candidate, e);
      }
    }
    
    if (!abortRef.current) {
      // Sort results
      results.sort((a, b) => a.n - b.n);
      const topResults = [...results].sort((a, b) => b.logRn - a.logRn).slice(0, 50);
      
      setAllData(results);
      setSpikes(autoTrackSpikes ? spikeResults : topResults);
      
      // Compute stats
      if (results.length > 0) {
        const maxResult = topResults[0];
        const minLogRn = Math.min(...results.map(r => r.logRn));
        const maxNComputed = Math.max(...results.map(r => r.n));
        
        setStats({
          total: results.length,
          maxLogRn: maxResult.logRn.toFixed(4),
          maxRatio: maxResult.ratio.toExponential(4),
          maxN: maxResult.n.toLocaleString(),
          minLogRn: minLogRn.toFixed(4),
          largestN: maxNComputed.toLocaleString(),
          spikes: autoTrackSpikes ? spikeResults.length : topResults.length
        });
      }
      
      setProgress(100);
    }
    
    setComputing(false);
  };
  
  const handleStop = () => {
    abortRef.current = true;
    setComputing(false);
  };
  
  // Downsample data for visualization
  const getVisualData = () => {
    if (allData.length <= 5000) return allData;
    
    const step = Math.ceil(allData.length / 5000);
    return allData.filter((_, i) => i % step === 0);
  };
  
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Erdős Problem #933 Explorer</h1>
        <p className="text-sm md:text-base text-gray-700">
          High-performance explorer for studying R(n) = (2^k · 3^l) / (n log n)
        </p>
      </div>
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h2 className="font-semibold mb-3 text-lg">Problem Statement</h2>
        <div className="space-y-2 text-sm md:text-base">
          <p>Given n(n+1) = 2^k · 3^l · m where gcd(m,6) = 1</p>
          <p className="font-mono bg-gray-100 p-2 rounded">
            R(n) = (2^k · 3^l) / (n log n)
          </p>
          <p className="font-semibold text-blue-700">Question: Does lim sup R(n) = ∞?</p>
        </div>
      </div>
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h2 className="font-semibold mb-3 text-lg">Configuration</h2>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium text-sm">
              Maximum n (supports up to 10^15):
            </label>
            <input 
              type="text" 
              value={maxNInput}
              onChange={(e) => setMaxNInput(e.target.value)}
              disabled={computing}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 1000000000000"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium text-sm">
              Sampling Density:
            </label>
            <select 
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              disabled={computing}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low (faster, fewer points)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (slower, more thorough)</option>
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox"
              checked={autoTrackSpikes}
              onChange={(e) => setAutoTrackSpikes(e.target.checked)}
              disabled={computing}
              className="w-4 h-4"
            />
            <span>Auto-track spikes (store only record-breaking values)</span>
          </label>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={computeData}
            disabled={computing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {computing ? 'Computing...' : 'Start Computation'}
          </button>
          
          {computing && (
            <button 
              onClick={handleStop}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Stop
            </button>
          )}
        </div>
        
        {computing && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div 
                className="bg-blue-600 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-all"
                style={{width: `${progress}%`}}
              >
                {progress}%
              </div>
            </div>
            {currentN && (
              <p className="text-sm text-gray-600">
                Processing n = {currentN.toLocaleString()}
              </p>
            )}
          </div>
        )}
        
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-semibold text-gray-700">Points Computed</div>
              <div className="text-xl font-bold text-blue-700">{stats.total.toLocaleString()}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-semibold text-gray-700">Max log(R(n))</div>
              <div className="text-xl font-bold text-green-700">{stats.maxLogRn}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="font-semibold text-gray-700">Max R(n)</div>
              <div className="text-xl font-bold text-purple-700">{stats.maxRatio}</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="font-semibold text-gray-700">At n =</div>
              <div className="text-xl font-bold text-orange-700">{stats.maxN}</div>
            </div>
          </div>
        )}
      </div>
      
      {allData.length > 0 && (
        <>
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">log(R(n)) vs log(n)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="n" 
                  type="number"
                  scale="log"
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => val.toExponential(0)}
                  label={{ value: 'log(n)', position: 'insideBottom', offset: -15 }}
                />
                <YAxis 
                  dataKey="logRn"
                  type="number"
                  domain={['auto', 'auto']}
                  label={{ value: 'log(R(n))', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'logRn') return [value.toFixed(4), 'log(R(n))'];
                    if (name === 'n') return [value.toLocaleString(), 'n'];
                    return value;
                  }}
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
                />
                <Scatter 
                  data={getVisualData()} 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
                {spikes.length > 0 && (
                  <Scatter 
                    data={spikes} 
                    fill="#ef4444" 
                    fillOpacity={0.9}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Blue: all computed points | Red: {autoTrackSpikes ? 'record-breaking spikes' : 'top values'}
            </p>
          </div>
          
          <div className="mb-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">
              {autoTrackSpikes ? 'Spike History (Record-Breaking Values)' : 'Top 50 Values'}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 md:px-3 py-2 border text-left">Rank</th>
                    <th className="px-2 md:px-3 py-2 border text-left">n</th>
                    <th className="px-2 md:px-3 py-2 border text-left">k (pow2)</th>
                    <th className="px-2 md:px-3 py-2 border text-left">l (pow3)</th>
                    <th className="px-2 md:px-3 py-2 border text-left">log(R(n))</th>
                    <th className="px-2 md:px-3 py-2 border text-left">R(n)</th>
                    <th className="px-2 md:px-3 py-2 border text-left">m</th>
                  </tr>
                </thead>
                <tbody>
                  {spikes.slice(0, 50).map((val, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-2 md:px-3 py-2 border font-semibold">{idx + 1}</td>
                      <td className="px-2 md:px-3 py-2 border font-mono text-blue-700">
                        {val.n.toLocaleString()}
                      </td>
                      <td className="px-2 md:px-3 py-2 border text-right">{val.pow2}</td>
                      <td className="px-2 md:px-3 py-2 border text-right">{val.pow3}</td>
                      <td className="px-2 md:px-3 py-2 border text-right font-bold text-green-700">
                        {val.logRn.toFixed(4)}
                      </td>
                      <td className="px-2 md:px-3 py-2 border text-right font-mono">
                        {val.ratio.toExponential(4)}
                      </td>
                      <td className="px-2 md:px-3 py-2 border text-right font-mono text-gray-600">
                        {val.remainder.toString().length > 15 
                          ? val.remainder.toExponential(2) 
                          : val.remainder.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-lg">Analysis Questions</h3>
            <ul className="space-y-2 text-sm md:text-base">
              <li className="flex gap-2">
                <span className="text-yellow-600">•</span>
                <span>Does log(R(n)) appear to be bounded or unbounded as n increases?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600">•</span>
                <span>What patterns emerge in the values of n that produce spikes?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600">•</span>
                <span>How does the growth rate of max(R(n)) compare to theoretical predictions?</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600">•</span>
                <span>Are spikes more frequent near powers of 2, powers of 3, or their products?</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default SmoothRatioExplorer;
