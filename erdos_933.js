// SmoothRatioExplorer.js

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Exact 2^k * 3^l extraction using BigInt
function extract23PowersBigInt(n) {
  let num = BigInt(n);
  let k = 0, l = 0;
  while (num % 2n === 0n) { k++; num /= 2n; }
  while (num % 3n === 0n) { l++; num /= 3n; }
  return { k, l, remainder: num };
}

// Compute log(R(n)) safely for huge n
function computeLogR(n) {
  const nBig = BigInt(n);
  const product = nBig * (nBig + 1n);
  const { k, l, remainder } = extract23PowersBigInt(product);
  const logSmooth = k * Math.log(2) + l * Math.log(3);
  const logR = logSmooth - Math.log(n) - Math.log(Math.log(n));
  return { n, k, l, remainder, logR, ratioApprox: Math.exp(logR) };
}

// Candidate generation
function generateCandidates(maxN) {
  const set = new Set();
  const maxPower2 = Math.floor(Math.log2(maxN)) + 1;
  const maxPower3 = Math.floor(Math.log(maxN)/Math.log(3)) + 1;
  for (let a=1;a<=maxPower2;a++) set.add(Number(2n**BigInt(a)-1n));
  for (let b=1;b<=maxPower3;b++) set.add(Number(3n**BigInt(b)-1n));
  for (let a=1;a<=20;a++) for (let b=1;b<=20;b++) {
    let n1 = Number(2n**BigInt(a) * 3n**BigInt(b) - 1n);
    let n2 = Number(2n**BigInt(a) * 3n**BigInt(b) + 1n);
    if(n1>1 && n1<=maxN) set.add(n1);
    if(n2>1 && n2<=maxN) set.add(n2);
  }
  // sparse regular sampling
  const step = Math.max(1, Math.floor(maxN/1000));
  for(let n=2;n<=maxN;n+=step) set.add(n);
  return Array.from(set).sort((a,b)=>a-b);
}

export default function SmoothRatioExplorer() {
  const [maxNInput,setMaxNInput] = useState('1000000');
  const [maxN,setMaxN] = useState(1000000);
  const [data,setData] = useState([]);
  const [top,setTop] = useState([]);

  const computeData = () => {
    const candidates = generateCandidates(maxN);
    const results = candidates.map(n=>computeLogR(n));
    results.sort((a,b)=>b.logR - a.logR);
    setTop(results.slice(0,30));
    results.sort((a,b)=>a.n - b.n);
    setData(results);
  };

  useEffect(()=>{ computeData(); },[maxN]);

  return (
    <div style={{padding:'20px',fontFamily:'sans-serif'}}>
      <h1>Erdős #933 Explorer (log-safe)</h1>
      <div style={{marginBottom:'10px'}}>
        Max n: <input value={maxNInput} onChange={e=>setMaxNInput(e.target.value)} />
        <button onClick={()=>setMaxN(parseInt(maxNInput.replace(/,/g,'')))}>Compute</button>
      </div>
      <div style={{width:'100%',height:400}}>
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="n" scale="log" domain={['auto','auto']} />
            <YAxis type="number" dataKey="ratioApprox" scale="log" domain={['auto','auto']} />
            <Tooltip formatter={(value,name)=>name==='n'?value.toLocaleString():value.toExponential(3)} />
            <Scatter data={data} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <h2>Top 30 R(n) values</h2>
      <table border='1' cellPadding='4' style={{borderCollapse:'collapse'}}>
        <thead>
          <tr><th>Rank</th><th>n</th><th>k</th><th>l</th><th>R(n) approx</th><th>m</th></tr>
        </thead>
        <tbody>
          {top.map((v,i)=>(<tr key={i}>
            <td>{i+1}</td>
            <td>{v.n.toLocaleString()}</td>
            <td>{v.k}</td>
            <td>{v.l}</td>
            <td>{v.ratioApprox.toExponential(3)}</td>
            <td>{v.remainder<1e12?v.remainder.toLocaleString():v.remainder.toExponential(2)}</td>
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}
