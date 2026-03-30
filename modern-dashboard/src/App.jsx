import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

/* ══════════ colour palette ══════════ */
const CITY_COLORS = {
  Mumbai:  { bg: 'rgba(92,124,250,.75)',  border: '#5c7cfa' },
  Delhi:   { bg: 'rgba(34,211,238,.70)',  border: '#22d3ee' },
  Pune:    { bg: 'rgba(52,211,153,.70)',  border: '#34d399' },
};

const CATEGORY_COLORS = [
  '#5c7cfa','#22d3ee','#34d399','#fb923c','#f472b6','#a78bfa'
];

/* ══════════ helpers ══════════ */
async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ══════════ SummaryCard ══════════ */
function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={{ color }}>{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

/* ══════════ DataTable ══════════ */
function DataTable({ title, columns, rows }) {
  return (
    <section className="section">
      <div className="section-title"><span className="icon">📄</span> {title}</div>
      <div className="chart-container" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '.88rem' }}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} style={{ padding: '.6rem .8rem', textAlign: 'left', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {columns.map((c, ci) => (
                  <td key={ci} style={{ padding: '.5rem .8rem', borderBottom: '1px solid var(--border-card)' }}>
                    {typeof row[c] === 'number' ? (c.includes('%') ? row[c].toFixed(2) + '%' : (row[c] > 999 ? formatCurrency(row[c]) : row[c])) : (row[c] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ══════════ App ══════════ */
export default function App() {
  const [rawData, setRawData]           = useState(null);
  const [history, setHistory]           = useState(null);
  const [growth, setGrowth]             = useState(null);
  const [overall, setOverall]           = useState(null);
  const [inflation, setInflation]       = useState(null);
  const [inflSummary, setInflSummary]   = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJson('/raw_data.json'),
      fetchJson('/inflation_history.json'),
      fetchJson('/growth_data.json'),
      fetchJson('/overall_growth.json'),
      fetchJson('/inflation_data.json'),
      fetchJson('/inflation_summary.json'),
    ]).then(([rd, h, g, o, i, is]) => {
      setRawData(rd);
      setHistory(h);
      setGrowth(g);
      setOverall(o);
      setInflation(i);
      setInflSummary(is);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  /* ―― derived data ―― */
  const cities = [...new Set(history.map(r => r.City))];
  const years  = [...new Set(history.map(r => r.Year))].sort();
  const categories = ['Food','Fuel','Rent','Transport','Utilities','Entertainment'];

  const highestCity = overall.reduce((a, b) =>
    a['Overall_Growth_%'] > b['Overall_Growth_%'] ? a : b
  );

  /* ── CHART OPTIONS COMMON ── */
  const commonOptions = (ylabel, fmtCb) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e8eaf6', font: { family: 'Inter' } } },
      tooltip: { callbacks: { label: fmtCb } },
    },
    scales: {
      x: { ticks: { color: '#9ea4c1' }, grid: { color: 'rgba(100,120,200,.1)' } },
      y: { title: { display: true, text: ylabel, color: '#9ea4c1' }, ticks: { color: '#9ea4c1' }, grid: { color: 'rgba(100,120,200,.1)' } },
    },
  });

  /* ── CHART 1: Total Cost Trend ── */
  const trendData = {
    labels: years,
    datasets: cities.map(city => {
      const c = CITY_COLORS[city] || { bg: '#999', border: '#666' };
      const cityRows = history.filter(r => r.City === city).sort((a,b) => a.Year - b.Year);
      return { label: city, data: cityRows.map(r => r.Total_Cost), borderColor: c.border, backgroundColor: c.bg, tension: .35, fill: false, pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 };
    }),
  };

  /* ── CHART 2: YoY Growth % ── */
  const yoyData = {
    labels: years.slice(1),
    datasets: cities.map(city => {
      const c = CITY_COLORS[city] || { bg: '#999', border: '#666' };
      const cityRows = history.filter(r => r.City === city && r['Yearly_Growth_%'] !== null).sort((a,b) => a.Year - b.Year);
      return { label: city, data: cityRows.map(r => r['Yearly_Growth_%']), borderColor: c.border, backgroundColor: c.bg, tension: .35, fill: false, pointRadius: 5, pointHoverRadius: 8, borderWidth: 2.5 };
    }),
  };

  /* ── CHART 3: Category Growth % (all cities) ── */
  const catGrowthData = {
    labels: categories,
    datasets: growth.map((item, idx) => ({
      label: item.City,
      data: categories.map(c => item[c]),
      backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      borderRadius: 6,
    })),
  };

  /* ── CHART 4: Mumbai-specific Category Growth % ── */
  const mumbaiGrowth = growth.find(g => g.City === 'Mumbai');
  const mumbaiCatData = {
    labels: categories,
    datasets: [{
      label: 'Mumbai',
      data: categories.map(c => mumbaiGrowth[c]),
      backgroundColor: CATEGORY_COLORS.slice(0, categories.length),
      borderRadius: 6,
    }],
  };

  /* ── CHART 5: Latest Year Category Comparison ── */
  const latestYear = Math.max(...years);
  const latestBarData = {
    labels: categories,
    datasets: inflation.map((item, idx) => ({
      label: item.City,
      data: categories.map(c => item[c]),
      backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      borderRadius: 6,
    })),
  };

  /* ══════════ RENDER ══════════ */
  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <h1>📊 India Cost-of-Living Analytics</h1>
        <p>Every data output from <strong>growth.ipynb</strong> &amp; <strong>inflation.ipynb</strong> — Mumbai · Delhi · Pune (2018–2024)</p>
      </header>

      <main className="main-content">
        {/* ── OVERVIEW CARDS ── */}
        <section className="section">
          <div className="section-title"><span className="icon">📋</span> Overview</div>
          <div className="cards-row">
            <SummaryCard label="Cities Tracked" value={cities.length} color="var(--accent-blue)" />
            <SummaryCard label="Year Range" value={`${years[0]} – ${years[years.length-1]}`} color="var(--accent-cyan)" />
            <SummaryCard
              label="Highest Overall Growth"
              value={`${highestCity['Overall_Growth_%']}%`}
              sub={highestCity.City}
              color="var(--accent-orange)"
            />
            {overall.map(c => (
              <SummaryCard
                key={c.City}
                label={`${c.City} Growth`}
                value={`${c['Overall_Growth_%']}%`}
                sub={`${formatCurrency(c.Start_Total)} → ${formatCurrency(c.End_Total)}`}
                color={CITY_COLORS[c.City]?.border || '#ccc'}
              />
            ))}
          </div>
        </section>

        {/* ── TABLE 1: Raw Dataset (growth.ipynb output 1) ── */}
        <DataTable
          title="Raw Dataset (data.csv)"
          columns={['Year','City',...categories,'Total_Cost']}
          rows={rawData}
        />

        {/* ── TABLE 2: Overall Growth Summary (growth.ipynb output 2) ── */}
        <DataTable
          title="Overall Growth Summary (2018 → 2024)"
          columns={['City','Start_Year','End_Year','Start_Total','End_Total','Overall_Growth_%']}
          rows={overall}
        />

        {/* ── TABLE 3: Category-wise Growth % (growth.ipynb output 5) ── */}
        <DataTable
          title="Category-wise Growth % (2018 → 2024)"
          columns={['City',...categories]}
          rows={growth}
        />

        {/* ── TABLE 4: YoY Growth Data (growth.ipynb output 8) ── */}
        <DataTable
          title="Year-on-Year Growth %"
          columns={['City','Year','Total_Cost','Yearly_Growth_%']}
          rows={history}
        />

        {/* ── TABLE 5: Inflation Summary (inflation.ipynb output 1) ── */}
        <DataTable
          title="Inflation Summary"
          columns={['City','Start_Year','End_Year','Start_Total','End_Total']}
          rows={inflSummary}
        />

        {/* ── TABLE 6: Latest Year Total Cost (inflation.ipynb output 2) ── */}
        <DataTable
          title={`Latest Year (${latestYear}) — City Total Cost`}
          columns={['City','Total_Cost']}
          rows={inflation}
        />

        {/* ── TABLE 7: Latest Year Full Category Data (inflation.ipynb output 4) ── */}
        <DataTable
          title={`Category-wise Costs — ${latestYear}`}
          columns={['City',...categories,'Total_Cost']}
          rows={inflation}
        />

        {/* ── CHART: Total Cost Trend (growth.ipynb chart 1 & inflation.ipynb chart 1) ── */}
        <section className="section">
          <div className="section-title"><span className="icon">📈</span> Overall Cost Growth by City / Overall Inflation Trend</div>
          <div className="chart-container">
            <div className="chart-wrapper" style={{ height: '380px' }}>
              <Line data={trendData} options={commonOptions('Total Cost', ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`)} />
            </div>
          </div>
        </section>

        {/* ── CHART: YoY Growth % (growth.ipynb chart 3) ── */}
        <section className="section">
          <div className="section-title"><span className="icon">📊</span> Year-on-Year Growth %</div>
          <div className="chart-container">
            <div className="chart-wrapper" style={{ height: '380px' }}>
              <Line data={yoyData} options={commonOptions('Growth %', ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`)} />
            </div>
          </div>
        </section>

        {/* ── CHART: Category Growth ALL cities (growth.ipynb chart 4) ── */}
        <section className="section">
          <div className="section-title"><span className="icon">🔥</span> Category-wise Growth Comparison for All Cities (2018–2024)</div>
          <div className="chart-container">
            <div className="chart-wrapper" style={{ height: '380px' }}>
              <Bar data={catGrowthData} options={commonOptions('Growth %', ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`)} />
            </div>
          </div>
        </section>

        {/* ── CHART: Mumbai Category Growth (growth.ipynb chart 2) ── */}
        <section className="section">
          <div className="section-title"><span className="icon">🏙️</span> Mumbai Category Growth % (2018–2024)</div>
          <div className="chart-container">
            <div className="chart-wrapper" style={{ height: '380px' }}>
              <Bar data={mumbaiCatData} options={{
                ...commonOptions('Growth %', ctx => `${ctx.label}: ${ctx.parsed.y}%`),
                plugins: { ...commonOptions('Growth %').plugins, legend: { display: false } },
              }} />
            </div>
          </div>
        </section>

        {/* ── CHART: Latest Year Category Comparison (inflation.ipynb chart 2) ── */}
        <section className="section">
          <div className="section-title"><span className="icon">⚖️</span> Category-wise Inflation Comparison — {latestYear}</div>
          <div className="chart-container">
            <div className="chart-wrapper" style={{ height: '380px' }}>
              <Bar data={latestBarData} options={commonOptions('Cost (₹)', ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`)} />
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="footer">
        Every data output from <strong>growth.ipynb</strong> &amp; <strong>inflation.ipynb</strong> — India Cost-of-Living Dashboard © 2026
      </footer>
    </div>
  );
}
