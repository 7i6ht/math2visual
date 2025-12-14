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
          size="sm:size-sm md:size-default lg:size-lg xl:size-xl 2xl:size-2xl 3xl:size-3xl 4xl:size-4xl 5xl:size-5xl 6xl:size-6xl 7xl:size-7xl"
          className="gap-1.5 sm:gap-2 px-2 sm:px-2.5 md:px-3 lg:px-3.5 xl:px-4 2xl:px-4.5 3xl:px-5 4xl:px-5.5 5xl:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 xl:py-3.5 2xl:py-4 3xl:py-4.5 4xl:py-5 5xl:py-5.5 !responsive-text-font-size"
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



