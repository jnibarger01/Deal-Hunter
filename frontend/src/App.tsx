import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/layout';
import { LandingPage, Dashboard, Deals, DealDetail } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="deals" element={<Deals />} />
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="ranked" element={<Deals />} />
          <Route path="calculator" element={<ComingSoon title="TMV Calculator" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>

        <Route path="/deals" element={<Navigate to="/app/deals" replace />} />
        <Route path="/deals/:id" element={<LegacyDealRedirect />} />
        <Route path="/ranked" element={<Navigate to="/app/ranked" replace />} />
        <Route path="/calculator" element={<Navigate to="/app/calculator" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Coming soon...
      </p>
    </div>
  );
}

export default App;

function LegacyDealRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/app/deals/${id}` : '/app/deals'} replace />;
}
