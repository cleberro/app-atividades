import { useNavigate } from 'react-router-dom';
import ItemForm from '../components/ItemForm';

export default function Novo() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Novo item</h1>
        <p className="mt-1 text-sm text-text-muted">
          Cria uma nova ação ou informação (Origem = "App"). Também pode ser usado como modal a partir de outras telas.
        </p>
      </header>
      <ItemForm onSucesso={() => navigate('/tabela')} />
    </div>
  );
}
