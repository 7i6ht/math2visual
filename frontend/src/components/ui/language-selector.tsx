import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 sm:gap-2 !responsive-text-font-size"
          aria-label={t('language.select')}
        >
          <Languages className="responsive-smaller-icon-font-size" />
          <span className="hidden sm:inline !responsive-text-font-size">
            {availableLanguages.find(lang => lang.code === language)?.name || 'English'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={0}
        alignOffset={0}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0 overflow-x-visible p-1 md:p-1.5 lg:p-2 [&>*:not(:last-child)]:mb-1"
      >
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer responsive-text-font-size flex items-center gap-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
              language === lang.code ? 'bg-accent' : ''
            }`}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



