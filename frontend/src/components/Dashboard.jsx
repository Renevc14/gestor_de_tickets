/**
 * Dashboard — Panel principal con lista de tickets y métricas Chart.js (RF06)
 * Monografía UCB: muestra métricas solo para ADMINISTRADOR
 */

import React, { useState, useEffect } from 'react';
import TicketFlowLogo from './Logo';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, reportAPI, getStoredUser, clearAuth } from '../services/api';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ─── Count-up hook ────────────────────────────────────────────────────────────
const useCountUp = (target, duration = 1100) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === undefined || target === null) return;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (frame >= totalFrames) { setCount(target); clearInterval(timer); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

// ─── Stat card icons ──────────────────────────────────────────────────────────
const IconTickets = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const IconClock = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconWarn = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// ─── Stat card component ──────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon }) => {
  const count = useCountUp(value);
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#848E9C' }}>{label}</p>
        <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-4xl font-bold tracking-tight leading-none" style={{ color }}>{count}</p>
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <div className="section-header">
    <div className="section-header-bar" />
    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#848E9C' }}>{title}</p>
  </div>
);

// ─── Badge style helpers ──────────────────────────────────────────────────────
const STATUS_STYLE = {
  NUEVO:      { background: 'rgba(240,185,11,0.1)', color: '#F0B90B', borderColor: 'rgba(240,185,11,0.3)' },
  ASIGNADO:   { background: 'rgba(30,136,229,0.1)', color: '#1E88E5', borderColor: 'rgba(30,136,229,0.3)' },
  EN_PROCESO: { background: 'rgba(249,115,22,0.1)', color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' },
  RESUELTO:   { background: 'rgba(3,166,109,0.1)',  color: '#03A66D', borderColor: 'rgba(3,166,109,0.3)' },
  CERRADO:    { background: 'rgba(132,142,156,0.1)',color: '#848E9C', borderColor: 'rgba(132,142,156,0.25)' },
  REABIERTO:  { background: 'rgba(207,48,74,0.1)',  color: '#CF304A', borderColor: 'rgba(207,48,74,0.3)' },
};

const PRIORITY_STYLE = {
  CRITICA: { background: 'rgba(207,48,74,0.1)',  color: '#CF304A', borderColor: 'rgba(207,48,74,0.3)' },
  ALTA:    { background: 'rgba(249,115,22,0.1)', color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' },
  MEDIA:   { background: 'rgba(240,185,11,0.1)', color: '#F0B90B', borderColor: 'rgba(240,185,11,0.3)' },
  BAJA:    { background: 'rgba(3,166,109,0.1)',  color: '#03A66D', borderColor: 'rgba(3,166,109,0.3)' },
};

const getStatusStyle   = (v) => STATUS_STYLE[v]   || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.2)' };
const getPriorityStyle = (v) => PRIORITY_STYLE[v] || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.2)' };

// ─── Chart defaults (Binance palette) ────────────────────────────────────────
const CHART_COLORS = {
  gold:    '#F0B90B',
  green:   '#03A66D',
  red:     '#CF304A',
  blue:    '#1E88E5',
  purple:  '#7C3AED',
  orange:  '#F97316',
};

const DOUGHNUT_DEFAULTS = {
  animation: { duration: 800, easing: 'easeInOutQuart' },
  cutout: '80%',          // anillo fino estilo Binance
  spacing: 2,             // pequeño gap entre segmentos
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#848E9C',
        padding: 14,
        usePointStyle: true,
        pointStyleWidth: 8,
        font: { size: 11 },
      }
    },
    tooltip: {
      backgroundColor: '#1E2329',
      borderColor: '#2B3139',
      borderWidth: 1,
      titleColor: '#EAECEF',
      bodyColor: '#848E9C',
      padding: 10,
      cornerRadius: 8,
    }
  },
};

const BAR_DEFAULTS = {
  animation: { duration: 800, easing: 'easeInOutQuart' },
  // Animación de hover rápida (igual que hoverOffset en doughnut)
  transitions: {
    active: { animation: { duration: 150 } }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E2329',
      borderColor: '#2B3139',
      borderWidth: 1,
      titleColor: '#EAECEF',
      bodyColor: '#848E9C',
      padding: 10,
      cornerRadius: 8,
    }
  },
  scales: {
    x: {
      ticks: { color: '#848E9C', font: { size: 11 } },
      grid: { display: false },           // sin líneas verticales — más limpio
      border: { color: 'rgba(43,49,57,0.5)' }
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#848E9C', font: { size: 11 }, stepSize: 1 },
      grid: { color: 'rgba(43,49,57,0.4)', lineWidth: 1 },
      border: { display: false }          // sin línea del eje Y
    }
  },
};

// ─── Chart: tickets por estado ────────────────────────────────────────────────
const StatusChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.status),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: [CHART_COLORS.gold, CHART_COLORS.purple, CHART_COLORS.blue, CHART_COLORS.green, '#4B5563', CHART_COLORS.orange],
      borderWidth: 3,
      borderColor: '#0B0E11',
      hoverOffset: 18,
      borderRadius: 4,
    }]
  };
  return (
    <div className="card">
      <SectionHeader title="Tickets por Estado" />
      <div className="mt-5">
        <Doughnut data={chartData} options={DOUGHNUT_DEFAULTS} />
      </div>
    </div>
  );
};

// ─── Chart: tickets por prioridad ────────────────────────────────────────────
const BAR_COLORS = [
  { solid: 'rgba(207,48,74,0.9)',  fade: 'rgba(207,48,74,0.35)',  hover: '#f04060' },
  { solid: 'rgba(249,115,22,0.9)', fade: 'rgba(249,115,22,0.35)', hover: '#fb923c' },
  { solid: 'rgba(240,185,11,0.9)', fade: 'rgba(240,185,11,0.35)', hover: '#fcd535' },
  { solid: 'rgba(3,166,109,0.9)',  fade: 'rgba(3,166,109,0.35)',  hover: '#10b981' },
];

const PriorityChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.priority),
    datasets: [{
      label: 'Tickets',
      data: data.map(d => d.count),
      // Gradiente vertical por barra: sólido arriba → casi transparente abajo
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { chartArea } = chart;
        if (!chartArea) return BAR_COLORS[ctx.dataIndex % BAR_COLORS.length].solid;
        const { solid, fade } = BAR_COLORS[ctx.dataIndex % BAR_COLORS.length];
        const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, solid);
        gradient.addColorStop(1, fade);
        return gradient;
      },
      hoverBackgroundColor: BAR_COLORS.map(c => c.hover),
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
      barPercentage: 0.52,       // barras más delgadas
      categoryPercentage: 0.75,
    }]
  };
  return (
    <div className="card">
      <SectionHeader title="Tickets por Prioridad" />
      <div className="mt-5">
        <Bar data={chartData} options={BAR_DEFAULTS} />
      </div>
    </div>
  );
};

// ─── Chart: tickets por categoría ────────────────────────────────────────────
const CategoryChart = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.category),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: data.map(d => d.color ? `${d.color}cc` : '#4B5563cc'),
      borderWidth: 3,
      borderColor: '#0B0E11',
      hoverOffset: 18,
      borderRadius: 4,
    }]
  };
  return (
    <div className="card">
      <SectionHeader title="Tickets por Categoria" />
      <div className="mt-5">
        <Doughnut data={chartData} options={DOUGHNUT_DEFAULTS} />
      </div>
    </div>
  );
};

// ─── Skeleton loading row ─────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    {[60, 180, 80, 70, 90, 80, 70, 40].map((w, i) => (
      <td key={i} className="px-4 py-3">
        <div className="skeleton h-3 rounded" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ onCreateClick }) => (
  <div className="card text-center py-16">
    <div
      className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(240,185,11,0.07)', border: '1px solid rgba(240,185,11,0.15)' }}
    >
      <svg className="w-8 h-8" style={{ color: '#F0B90B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-white mb-1">Sin tickets</h3>
    <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: '#848E9C' }}>
      No hay tickets que coincidan con los filtros seleccionados
    </p>
    <button onClick={onCreateClick} className="btn-primary">Crear Ticket</button>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);   // skeleton inicial
  const [fetching, setFetching] = useState(false); // recarga silenciosa
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', page: 1, limit: 10 });
  const [searchInput, setSearchInput] = useState('');
  const [pagination, setPagination] = useState({});
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Tickets: recarga con cada cambio de filtro/página/búsqueda
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.priority, filters.page, filters.search]);

  // Debounce para el campo de búsqueda (400 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTickets([]);
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Métricas: solo se cargan una vez al montar el componente
  useEffect(() => {
    if (!user || user.role !== 'ADMINISTRADOR') return;
    loadMetrics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTickets = async () => {
    const isInitial = tickets.length === 0;
    try {
      if (isInitial) setLoading(true);
      else setFetching(true);
      setError('');
      const response = await ticketAPI.listTickets(filters);
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Error cargando tickets');
      if (err.response?.status === 401) { clearAuth(); navigate('/login'); }
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const response = await reportAPI.getDashboard();
      console.log('[Dashboard] metrics raw:', JSON.stringify(response.data));
      setMetrics(response.data.data);
    } catch (err) {
      console.error('[Dashboard] loadMetrics error:', err?.response?.status, err?.response?.data || err?.message);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // Al cambiar filtros, limpiar tickets para mostrar skeleton
    setTickets([]);
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TicketFlowLogo size={36} />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">TicketFlow</h1>
                <p className="text-teams-gray-dark text-xs mt-0.5">Sistema de Gestion de Tickets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{user?.name}</p>
                <p className="text-teams-gray-dark text-xs mt-0.5">{user?.role}</p>
              </div>
              <div className="w-px h-8 bg-zinc-700" />
              <button onClick={() => navigate('/mfa-setup')} className="btn-secondary text-sm flex items-center gap-1.5" title="Configurar autenticación de dos factores">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                MFA
              </button>
              {user?.role === 'ADMINISTRADOR' && (
                <button onClick={() => navigate('/admin')} className="btn-secondary text-sm">
                  Panel Admin
                </button>
              )}
              <button onClick={handleLogout} className="btn-danger text-sm">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Métricas RF06 — solo ADMINISTRADOR */}
        {user?.role === 'ADMINISTRADOR' && (
          <>
            {/* Stat cards */}
            {loadingMetrics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="stat-card">
                    <div className="skeleton h-2.5 w-16 mb-4" />
                    <div className="skeleton h-10 w-12" />
                  </div>
                ))}
              </div>
            ) : metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total"      value={metrics.summary.total}       color="#818CF8" icon={<IconTickets />} />
                <StatCard label="Abiertos"   value={metrics.summary.open}        color="#F0B90B" icon={<IconClock />} />
                <StatCard label="Resueltos"  value={metrics.summary.resolved}    color="#03A66D" icon={<IconCheck />} />
                <StatCard label="SLA Vencidos" value={metrics.summary.slaBreaches} color="#CF304A" icon={<IconWarn />} />
              </div>
            )}

            {/* Charts */}
            {!loadingMetrics && metrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {metrics.ticketsByStatus?.length > 0   && <StatusChart   data={metrics.ticketsByStatus} />}
                {metrics.ticketsByPriority?.length > 0 && <PriorityChart data={metrics.ticketsByPriority} />}
                {metrics.ticketsByCategory?.length > 0 && <CategoryChart data={metrics.ticketsByCategory} />}
              </div>
            )}
          </>
        )}

        {/* Filtros + Nuevo Ticket */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Mis Tickets</h2>
              {!loading && (
                <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>
                  {pagination.total ?? tickets.length} ticket{(pagination.total ?? tickets.length) !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button onClick={() => navigate('/tickets/create')} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Ticket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-group">
              <label className="label">Buscar</label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Titulo o descripcion..."
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Estado</label>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="input">
                <option value="">Todos</option>
                <option value="NUEVO">Nuevo</option>
                <option value="ASIGNADO">Asignado</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="RESUELTO">Resuelto</option>
                <option value="CERRADO">Cerrado</option>
                <option value="REABIERTO">Reabierto</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Prioridad</label>
              <select name="priority" value={filters.priority} onChange={handleFilterChange} className="input">
                <option value="">Todas</option>
                <option value="CRITICA">Critica</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setTickets([]); setSearchInput(''); setFilters({ status: '', priority: '', search: '', page: 1, limit: 10 }); }}
                className="btn-secondary w-full"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error"><span>{error}</span></div>}

        {/* Tabla / Skeleton / Empty */}
        {loading ? (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-bg-tertiary">
                  {['ID', 'Titulo', 'Estado', 'Prioridad', 'Categoria', 'Asignado', 'Creado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-bg-tertiary">
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : tickets.length === 0 && !fetching ? (
          <EmptyState onCreateClick={() => navigate('/tickets/create')} />
        ) : (
          <>
            <div
              className="card overflow-x-auto transition-opacity duration-200"
              style={{ opacity: fetching ? 0.5 : 1, pointerEvents: fetching ? 'none' : 'auto' }}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-bg-tertiary">
                    {['ID', 'Titulo', 'Estado', 'Prioridad', 'Categoria', 'Asignado', 'Creado', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-bg-tertiary">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="table-row-hover">
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: '#F0B90B' }}>
                        #{ticket.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white max-w-[220px] truncate">
                        {ticket.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge" style={getStatusStyle(ticket.status)}>{ticket.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge" style={getPriorityStyle(ticket.priority)}>{ticket.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ticket.category ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${ticket.category.color}22`, color: ticket.category.color, border: `1px solid ${ticket.category.color}44` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ticket.category.color }} />
                            {ticket.category.name}
                          </span>
                        ) : (
                          <span style={{ color: '#848E9C' }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#848E9C' }}>
                        {ticket.assignee?.name || <span className="italic">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#848E9C' }}>
                        {new Date(ticket.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="btn-ghost-gold"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setFilters(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1 || fetching}
                  className="btn-secondary disabled:opacity-50"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-2">
                  {fetching && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                  <span className="text-sm" style={{ color: '#848E9C' }}>
                    Pagina <span className="font-semibold text-white">{pagination.page}</span> de{' '}
                    <span className="font-semibold text-white">{pagination.pages}</span>
                  </span>
                </div>
                <button
                  onClick={() => setFilters(p => ({ ...p, page: Math.min(pagination.pages, p.page + 1) }))}
                  disabled={pagination.page === pagination.pages || fetching}
                  className="btn-secondary disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
