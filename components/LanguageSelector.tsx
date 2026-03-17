"use client";

import { Language, LANGUAGE_LABELS } from "@/types";

interface LanguageSelectorProps {
  selected: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
}

const languages: Language[] = [
  "hindi",
  "english",
  "bengali",
  "gujarati",
  "kannada",
  "malayalam",
  "marathi",
  "odia",
  "punjabi",
  "tamil",
  "telugu",
];

export default function LanguageSelector({
  selected,
  onChange,
  disabled,
}: LanguageSelectorProps) {
  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-2">
        भाषा चुनें / Select Language
      </label>
      <div className="grid grid-cols-4 gap-2">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => onChange(lang)}
            disabled={disabled}
            className={`
              py-2.5 px-3 rounded-xl text-sm font-medium transition-all border
              ${
                selected === lang
                  ? "bg-accent text-background border-accent shadow-[0_0_12px_rgba(74,222,128,0.3)]"
                  : "bg-surface-2 text-text-secondary border-border hover:border-accent/40 hover:text-text-primary"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
