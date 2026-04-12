import React, { memo, useEffect, useState } from "react";
import { getLeaderboard, BenchmarkResult } from "../../services/benchmarkService";
import "./Leaderboard.scss";

export const Leaderboard: React.FC<{ refreshTrigger?: number }> = memo(({ refreshTrigger }) => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      const data = await getLeaderboard(10);
      setResults(data);
      setLoading(false);
    };
    fetchResults();
  }, [refreshTrigger]);

  if (loading && results.length === 0) {
    return <div className="leaderboard-loading">Loading global benchmarks...</div>;
  }

  return (
    <div className="leaderboard-section">
      <div className="section-header">
        <h3 className="section-title">Global Performance Leaderboard</h3>
        <p className="section-subtitle">Real-world results from devices across the globe.</p>
      </div>

      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Throughput</th>
              <th>FPS</th>
              <th>Dataset</th>
              <th>Environment</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res, index) => (
              <tr key={res.id} className={index === 0 ? "gold" : ""}>
                <td className="rank">#{(index + 1).toString().padStart(2, '0')}</td>
                <td className="user">{res.userName}</td>
                <td className="throughput">
                  <span className="value">{(res.updatesPerSec || 0).toLocaleString()}</span>
                  <span className="unit">ups</span>
                </td>
                <td className="fps">
                  <span className="value">{res.fps || 60}</span>
                  <span className="unit">fps</span>
                </td>
                <td className="dataset">{(res.totalItems || 0).toLocaleString()} rows</td>
                <td className="env">
                  <span className="browser">{res.browser || "Unknown"}</span>
                  <span className="sep">/</span>
                  <span className="os">{res.os || "Unknown"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
