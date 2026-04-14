import type { IconType } from 'react-icons';

interface Section {
  id: string;
  label: string;
  icon: IconType;
  count?: number;
}

interface SidebarNavProps {
  sections: Section[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  title: string;
  state?: string;
  onBack: () => void;
}

export function SidebarNav({ 
  sections, 
  activeSection, 
  onSectionChange,
  title,
  state,
  onBack 
}: SidebarNavProps) {
  return (
    <div className="w-64 bg-[#1a202c] border-r border-white/10">
      <div className="p-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white flex items-center space-x-2"
        >
          <span>←</span>
          <span>Torna indietro</span>
        </button>
      </div>
      
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
        {state && (
          <span className={`mt-2 inline-block px-2 py-1 rounded-full text-xs ${
            state === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {state === 'published' ? 'Pubblicato' : 'Bozza'}
          </span>
        )}
      </div>

      <nav className="p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg mb-1 ${
              activeSection === section.id 
                ? 'bg-[#FC0045] text-white' 
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span>
                <section.icon className="text-base" />
              </span>
              <span>{section.label}</span>
            </div>
            {section.count !== undefined && (
              <span className="bg-white/10 px-2 py-1 rounded-full text-xs">
                {section.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}