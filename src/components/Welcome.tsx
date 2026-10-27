import { ArrowRight, Code2, FileSearch, FolderOpen, Lightbulb, MessageSquareText } from 'lucide-react';

interface WelcomeProps {
  onNew: (prompt?: string) => void;
}

const suggestions = [
  { icon: Code2, title: 'Construir algo', text: 'Crie uma página de produto responsiva' },
  { icon: FileSearch, title: 'Entender um projeto', text: 'Analise a arquitetura dos arquivos anexados' },
  { icon: Lightbulb, title: 'Pensar junto', text: 'Transforme uma ideia em um plano executável' },
  { icon: MessageSquareText, title: 'Escrever melhor', text: 'Revise este texto e deixe mais direto' },
];

export function Welcome({ onNew }: WelcomeProps) {
  return (
    <main className="welcome">
      <div className="welcome-inner">
        <div className="welcome-mark">C</div>
        <h1>O que vamos realizar?</h1>
        <p>Comece uma tarefa, anexe seus arquivos e trabalhe com seu modelo preferido.</p>
        <button className="welcome-new" onClick={() => onNew()}><span>Começar uma nova tarefa</span><ArrowRight size={18} /></button>
        <div className="suggestion-grid">
          {suggestions.map(({ icon: Icon, title, text }) => (
            <button key={title} onClick={() => onNew(text)}><Icon size={18} /><strong>{title}</strong><span>{text}</span></button>
          ))}
        </div>
        <div className="browser-capabilities"><FolderOpen size={15} /><span>Arquivos e projetos permanecem no seu navegador.</span></div>
      </div>
    </main>
  );
}
