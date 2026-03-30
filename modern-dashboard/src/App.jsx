import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CATEGORY_COLORS = {
  Food: '#c9af42', // gold
  Fuel: '#4ade80', // green
  Rent: '#f87171', // red
  Transport: '#38bdf8', // blue
  Utilities: '#f472b6', // pink
  Entertainment: '#a78bfa' // purple
};

const CATEGORIES = ['Food', 'Fuel', 'Rent', 'Transport', 'Utilities', 'Entertainment'];

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export default function App() {
  const [rawData, setRawData] = useState(null);
  const [history, setHistory] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [overall, setOverall] = useState(null);
  const [inflation, setInflation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Delhi');

  useEffect(() => {
    Promise.all([
      fetchJson('/raw_data.json'),
      fetchJson('/inflation_history.json'),
      fetchJson('/growth_data.json'),
      fetchJson('/overall_growth.json'),
      fetchJson('/inflation_data.json')
    ]).then(([rd, h, g, o, i]) => {
      setRawData(rd);
      setHistory(h);
      setGrowth(g);
      setOverall(o);
      setInflation(i);
      setLoading(false);
    }).catch(e => {
        console.error("Failed to fetch data", e);
        setLoading(false);
    });
  }, []);

  if (loading || !history || !rawData) return <div style={{padding: '2rem'}}>Loading...</div>;

  const cities = [...new Set(history.map(r => r.City))];
  const years = [...new Set(history.map(r => r.Year))].sort();

  const highestCity = overall.reduce((a, b) =>
    a['Overall_Growth_%'] > b['Overall_Growth_%'] ? a : b
  );

  const selectedCityHistory = history.filter(r => r.City === selectedCity).sort((a,b) => a.Year - b.Year);

  // Line Chart Data
  const lineData = {
    labels: years,
    datasets: CATEGORIES.map(cat => ({
      label: cat,
      data: selectedCityHistory.map(r => {
        const row = rawData.find(d => d.City === selectedCity && d.Year === r.Year);
        return row ? row[cat] : null;
      }),
      borderColor: CATEGORY_COLORS[cat],
      backgroundColor: CATEGORY_COLORS[cat],
      tension: 0,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      borderWidth: 2
    }))
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, boxWidth: 6, boxHeight: 6, padding: 20, font: {family: 'Inter', size: 12, weight: 600}, color: '#888' }
      },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#888', font: {family: 'Inter'} } },
      y: { title: { display: true, text: 'Cost (₹)', color: '#888' }, border: { dash: [4, 4], display: false }, grid: { color: '#f0f0f0' }, ticks: { color: '#888', callback: v => v >= 1000 ? formatCurrency(v).replace('₹', '') : v } }
    }
  };

  // Doughnut Chart Data
  const selectedCityLatest = inflation.find(i => i.City === selectedCity) || {};
  const doughnutData = {
    labels: CATEGORIES,
    datasets: [{
      data: CATEGORIES.map(c => selectedCityLatest[c] || 0),
      backgroundColor: CATEGORIES.map(c => CATEGORY_COLORS[c]),
      borderWidth: 0,
      cutout: '55%'
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { usePointStyle: true, padding: 15, font: {family: 'Inter', size: 11}, color: '#666' }
      }
    }
  };

  // Bar Chart Data
  const selectedCityGrowth = growth.find(g => g.City === selectedCity) || {};
  const barData = {
    labels: CATEGORIES,
    datasets: [{
      label: `Growth % (${years[years.length-1]})`,
      data: CATEGORIES.map(c => selectedCityGrowth[c] || 0),
      backgroundColor: '#d6b758',
      borderRadius: 4,
      barPercentage: 0.6
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: {size: 11}, color: '#666' } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#888' } },
      y: { title: { display: true, text: 'Growth %', color: '#888' }, grid: { color: '#f0f0f0' }, ticks: { color: '#888' } }
    }
  };

  // Table Data
  const tableRows = [...selectedCityHistory].reverse().map(r => {
    const rawRow = rawData.find(d => d.City === selectedCity && d.Year === r.Year);
    return {
      year: r.Year,
      food: rawRow ? rawRow.Food : 0,
      fuel: rawRow ? rawRow.Fuel : 0
    };
  });

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="menu-icon top-icon">▲</div>
        <div className="menu-icon active">⊞</div>
        <div className="menu-icon bottom-icon">ⓘ</div>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="search-bar">🔍 Search cities...</div>
          <div className="title-bar">
            India Inflation Analytics Dashboard 
            <span style={{marginLeft:'8px', cursor:'pointer'}}>📋</span>
          </div>
          <div className="action-bar">
            <button className="share-btn">Share</button>
            <div className="avatar">P</div>
          </div>
        </header>

        <div className="content">
          <div className="top-row">
            <div className="chart-card overview-card">
              <div className="card-header">
                <h2>Inflation Overview</h2>
                <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="overview-stats">
                <div>
                  <div className="stat-label">TOTAL CITIES</div>
                  <div className="stat-value retro-font">{cities.length}</div>
                </div>
                <div>
                  <div className="stat-label">YEAR RANGE</div>
                  <div className="stat-value retro-font">{years[0]} - {years[years.length-1]}</div>
                </div>
              </div>
              <div className="line-chart-area">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

            <div className="summary-card">
              <h2>Summary</h2>
              <div className="summary-item">
                <div className="summary-label">HIGHEST INFLATION</div>
                <div className="summary-val green retro-font">{highestCity.City}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">CITIES TRACKED</div>
                <div className="summary-val gold retro-font">{cities.length}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">DATA SINCE</div>
                <div className="summary-val red retro-font">{years[0]}</div>
              </div>
            </div>
          </div>

          <div className="bottom-row">
            <div className="chart-card bottom-card">
              <h2>Category Breakdown</h2>
              <div className="doughnut-chart-area">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>

            <div className="chart-card bottom-card">
              <h2>Growth Trends</h2>
              <div className="bar-chart-area" style={{paddingTop: '10px'}}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            <div className="chart-card bottom-card" style={{paddingRight: '1rem'}}>
              <div className="card-header" style={{marginBottom: 0, paddingRight: '0.8rem'}}>
                <h2>Yearly Data</h2>
                <a href="#view-all">View All</a>
              </div>
              <div className="table-area">
                <table>
                  <thead>
                    <tr>
                      <th>YEAR</th>
                      <th className="right-align">FOOD</th>
                      <th className="right-align">FUEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.slice(0, 5).map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td className="right-align">{formatCurrency(row.food)}</td>
                        <td className="right-align">{formatCurrency(row.fuel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
