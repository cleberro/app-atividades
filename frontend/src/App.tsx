import { Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import Hoje from './pages/Hoje';
import Tabela from './pages/Tabela';
import Kanban from './pages/Kanban';
import Temas from './pages/Temas';
import TemaDetail from './pages/TemaDetail';
import Novo from './pages/Novo';
import Habitos from './pages/Habitos';
import Rotinas from './pages/Rotinas';

export default function App() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Hoje />} />
          <Route path="/tabela" element={<Tabela />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/temas" element={<Temas />} />
          <Route path="/temas/:id" element={<TemaDetail />} />
          <Route path="/habitos" element={<Habitos />} />
          <Route path="/rotinas" element={<Rotinas />} />
          <Route path="/novo" element={<Novo />} />
        </Routes>
      </main>
    </div>
  );
}
