import ContatosWhatsappSection from '../components/ContatosWhatsappSection';
import ContatosEmailSection from '../components/ContatosEmailSection';

export default function Contatos() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Contatos</h1>
        <p className="mt-1 text-sm text-text-muted">
          Pessoas que podem receber itens de um tema (ou avisos de prazo vencido) por WhatsApp ou e-mail.
        </p>
      </header>

      <ContatosWhatsappSection />

      <div className="border-t border-white/10" />

      <ContatosEmailSection />
    </div>
  );
}
