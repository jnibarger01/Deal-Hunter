import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { Dashboard, Deals, DealDetail } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/deals/:id" element={<DealDetail />} />
          <Route path="/ranked" element={<Deals />} />
          <Route path="/calculator" element={<ComingSoon title="TMV Calculator" />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Placeholder for pages not yet implemented
function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--text-2xl)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: '0.5rem',
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: 'var(--text-base)',
        color: 'var(--color-text-tertiary)',
      }}>
        Coming soon...
      </p>
    </div>
  );
}

export default App;
