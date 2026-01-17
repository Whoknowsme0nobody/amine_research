import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

// Optimized power extraction using BigInt
function extract23PowersBigInt(n) {
  let num = BigInt(n);
  let pow2 = 0;
  let pow3 = 0;
  
  while (num % 2n === 0n) {
    pow2++;
    num = num / 2n;
  }
  
  while (num % 3n === 0n) {
    pow3++;
    num = num / 3n;
  }
  
  return { pow2, pow3, remainder: num };
}

function computeRatioBigInt(n) {
  const nBig = BigInt(n);
  const product = nBig * (nBig + 1n);
  const { pow2, pow3, remainder } = extract23PowersBigInt(product);
  
  // Compute 2^k * 3^l more carefully
  const smoothPart = (2n ** BigInt(pow2)) * (3n ** BigInt(pow3));
  
  // R(n) = smoothPart / (n * log(n))
  const logN = Math.log(n);
  const ratio = Number(smoothPart) / (n * logN);
  
  return {
    n,
    pow2,
    pow3,
    remainder: Number(remainder),
    smoothPartLog: pow2 * Math.log(2) + pow3 * Math.log(3),
    ratio,
    logRatio: Math.log10(ratio)
  };
}

// Generate strategic values to test
function generateCandidates(maxN, sampleCount) {
  const candidates = new Set();
  
  // Regular sampling (sparse for large ranges)
  const step = Math.max(1, Math.floor(maxN / Math.min(sampleCount, 1000)));
  for (let n = 2; n <= maxN; n += step) {
    candidates.add(n);
  }
  
  // Powers of 2 minus 1 (n = 2^k - 1, then n+1 = 2^k)
  for (let k = 2; k <= 100; k++) {
    const n = (2n ** BigInt(k)) - 1n;
    if (n <= BigInt(maxN)) candidates.add(Number(n));
  }
  
  // Powers of 3 minus 1
  for (let k = 2; k <= 65; k++) {
    const n = (3n ** BigInt(k)) - 1n;
    if (n <= BigInt(maxN)) candidates.add(Number(n));
  }
  
  // 2^a * 3^b - 1 (highly smooth n+1)
  for (let a = 1; a <= 40; a++) {
    for (let b = 1; b <= 25; b++) {
      const n = (2n ** BigInt(a)) * (3n ** BigInt(b)) - 1n;
      if (n <= BigInt(maxN)) candidates.add(Number(n));
    }
  }
  
  // 2^a * 3^b + 1 (might have smooth n)
  for (let a = 1; a <= 40; a++) {
    for (let b = 1; b <= 25; b++) {
      const n = (2n ** BigInt(a)) * (3n ** BigInt(b)) + 1n;
      if (n <= BigInt(maxN)) candidates.add(Number(n));
    }
  }
  
  // Dense sampling around powers of 2 and 3
  for (let k = 10; k <= 60; k++) {
    const center = Number(2n ** BigInt(k));
    if (center <= maxN) {
      for (let offset = -100; offset <= 100; offset++) {
        const n = center + offset;
        if (n >= 2 && n <= maxN) candidates.add(n);
      }
    }
  }
  
  for (let k = 6; k <= 40; k++) {
    const center = Number(3n ** BigInt(k));
    if (center <= maxN) {
      for (let offset = -100; offset <= 100; offset++) {
        const n = center + offset;
        if (n >= 2 && n <= maxN) candidates.add(n);
      }
    }
  }
  
  return Array.from(candidates).sort((a, b) => a - b);
}

function SmoothRatioExplorer() {
  const [maxNInput, setMaxNInput] = useState('1000000');
  const [maxN, setMaxN] = useState(1000000);
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState([]);
  const [topValues, setTopValues] = useState([]);
  const [stats, setStats] = useState(null);
  const workerRef = useRef(null);
  
  const computeData = () => {
    setComputing(true);
    setProgress(0);
    
    const candidates = generateCandidates(maxN, 10000);
    const results = [];
    const batchSize = 1000;
    
    let processed = 0;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      setTimeout(() => {
        for (const n of batch) {
          try {
            const result = computeRatioBigInt(n);
            if (isFinite(result.ratio) && result.ratio > 0) {
              results.push(result);
            }
          } catch (e) {
            // Skip values that are too large
          }
        }
        
        processed += batch.length;
        setProgress(Math.floor(100 * processed / candidates.length));
        
        if (processed >= candidates.length) {
          // Sort and analyze
          results.sort((a, b) => a.n - b.n);
          const sorted = [...results].sort((a, b) => b.ratio - a.ratio);
          
          setData(results);
          setTopValues(sorted.slice(0, 30));
          
          // Compute statistics
          const maxRatio = sorted[0].ratio;
          const maxRatioN = sorted[0].n;
          const medianRatio = sorted[Math.floor(sorted.length / 2)].ratio;
          
          setStats({
            totalComputed: results.length,
            maxRatio: maxRatio.toFixed(6),
            maxRatioN: maxRatioN.toLocaleString(),
            medianRatio: medianRatio.toFixed(6),
            largestN: results[results.length - 1].n.toLocaleString()
          });
          
          setComputing(false);
        }
      }, 0);
    }
  };
  
  useEffect(() => {
    computeData();
  }, [maxN]);
  
  const handleSetMaxN = () => {
    const val = parseInt(maxNInput.replace(/,/g, ''));
    if (val > 0 && val <= 1e15) {
      setMaxN(val);
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">High-Performance R(n) Explorer</h1>
      
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-2">Problem: Does lim sup R(n) = ∞?</h2>
        <p className="text-sm mb-2">where R(n) = (2^k · 3^l) / (n log n)</p>
        <p className="text-sm">and n(n+1) = 2^k · 3^l · m with gcd(m,6) = 1</p>
      </div>
      
      <div className="mb-6 p-4 bg-white rounded shadow">
        <label className="block mb-2 font-semibold">
          Maximum n to explore:
        </label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={maxNInput}
            onChange={(e) => setMaxNInput(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
            placeholder="e.g., 1000000000"
          />
          <button 
            onClick={handleSetMaxN}
            disabled={computing}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Compute
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Current: {maxN.toLocaleString()} | Supports up to 10^15
        </div>
        
        {computing && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded">
              <div 
                className="bg-blue-600 text-xs text-white text-center p-1 rounded"
                style={{width: `${progress}%`}}
              >
                {progress}%
              </div>
            </div>
          </div>
        )}
        
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold">Points Computed:</div>
              <div>{stats.totalComputed.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-semibold">Max R(n):</div>
              <div>{stats.maxRatio}</div>
            </div>
            <div>
              <div className="font-semibold">at n =:</div>
              <div>{stats.maxRatioN}</div>
            </div>
            <div>
              <div className="font-semibold">Largest n:</div>
              <div>{stats.largestN}</div>
            </div>
          </div>
        )}
      </div>
      
      {data.length > 0 && (
        <>
          <div className="mb-8 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-bold mb-4">R(n) vs n (Log-Log Scale)</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="n" 
                  type="number"
                  scale="log"
                  domain={['auto', 'auto']}
                  label={{ value: 'n (log scale)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="ratio"
                  type="number"
                  scale="log"
                  domain={['auto', 'auto']}
                  label={{ value: 'R(n) (log scale)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'ratio') return value.toExponential(4);
                    if (name === 'n') return value.toLocaleString();
                    return value;
                  }}
                />
                <Scatter data={data} fill="#3b82f6" size={20} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mb-8 p-4 bg-white rounded shadow">
            <h2 className="text-xl font-bold mb-4">Top 30 Values of R(n)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 border">Rank</th>
                    <th className="px-3 py-2 border">n</th>
                    <th className="px-3 py-2 border">k</th>
                    <th className="px-3 py-2 border">l</th>
                    <th className="px-3 py-2 border">log(2^k·3^l)</th>
                    <th className="px-3 py-2 border">m</th>
                    <th className="px-3 py-2 border">R(n)</th>
                  </tr>
                </thead>
                <tbody>
                  {topValues.map((val, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-3 py-2 border text-center font-semibold">{idx + 1}</td>
                      <td className="px-3 py-2 border text-right font-mono">{val.n.toLocaleString()}</td>
                      <td className="px-3 py-2 border text-right">{val.pow2}</td>
                      <td className="px-3 py-2 border text-right">{val.pow3}</td>
                      <td className="px-3 py-2 border text-right">{val.smoothPartLog.toFixed(2)}</td>
                      <td className="px-3 py-2 border text-right font-mono">
                        {val.remainder < 1e12 ? val.remainder.toLocaleString() : val.remainder.toExponential(2)}
                      </td>
                      <td className="px-3 py-2 border text-right font-bold text-blue-700">
                        {val.ratio.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded shadow">
            <h3 className="font-semibold mb-2">Analysis:</h3>
            <p className="mb-2">Based on the computation, what pattern do you observe?</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Does R(n) appear to be bounded or unbounded?</li>
              <li>What types of n give the largest R(n) values?</li>
              <li>How does max R(n) change as you increase the search range?</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default SmoothRatioExplorer;
