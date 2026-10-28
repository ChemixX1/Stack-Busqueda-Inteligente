'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, Bookmark, Check, ChevronDown, Copy, ExternalLink, Globe2, Grid2X2, List, LoaderCircle, Search, Settings2, SlidersHorizontal, Square, Star, Upload, User, X } from 'lucide-react';
import { categories, countries, countryName, priority } from '@/lib/catalog';
import type { Audit, Prospect, SearchResult } from '@/lib/types';
import { canReuseAudit } from '@/lib/audit-version';
import { businessName } from '@/lib/business-name';
import { contactMessage, contactWhatsappUrl, csvFile, downloadFile, emailUrl, formatPhone, hasNativeTemplate, localizedContactMessage, localizedEmailSubject, parseImport, resolveSiteLanguage, uniqueContacts } from '@/lib/client';

type Section = 'results' | 'saved';
type SearchOptions = { query: string; country: string; category: string };
type Config = { searchProvider: string; searchConfigured: boolean; pageSpeedConfigured: boolean };
type ScanProgress = { round: number; found: number; done: number; failed: number; phase: string };
type SelectOption = { value: string; label: string };

const SAVED_KEY = 'stack-prospects-v1';
const RESULTS_KEY = 'stack-results-v1';
const OPTIONS_KEY = 'stack-search-v2';
const contentIssues = new Set(['content-overload', 'unstructured-content', 'text-walls', 'repeated-content', 'generic-copy', 'link-overload', 'repetitive-description', 'placeholder-content']);
const designIssues = new Set(['viewport', 'fixed-width', 'obsolete-markup', 'inline-styles', 'placeholder-content', 'unstructured-content', 'text-walls', 'content-overload', 'heading-order', 'missing-h1', 'zoom']);
const defaultOptions: SearchOptions = { query: '', country: 'ALL', category: categories[0] };
const stageLabels = { new: 'Por contactar', contacted: 'Contactado', replied: 'En conversación', closed: 'Cerrado' };
const issueLabels: Record<string, string> = { structure: 'Estructura', mobile: 'Móvil', performance: 'Rendimiento', accessibility: 'Accesibilidad', security: 'Seguridad', availability: 'Disponibilidad' };
const statusLabels = { active: 'Revisada', blocked: 'Revisión bloqueada', unreachable: 'Sin respuesta' };

const countryOptions: SelectOption[] = countries.map(([value, label]) => ({ value, label }));
const categoryOptions: SelectOption[] = categories.map(value => ({ value, label: value }));
const thresholdOptions: SelectOption[] = [
  { value: '15', label: 'Con problemas · 15+' },
  { value: '35', label: 'Prioridad alta · 35+' },
  { value: '65', label: 'Prioridad crítica · 65+' },
  { value: '0', label: 'Todas las revisiones' },
];
const issueFilterOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los problemas' },
  { value: 'design', label: 'Diseño y maquetación' },
  { value: 'content', label: 'Saturación y contenido' },
  ...Object.entries(issueLabels).map(([value, label]) => ({ value, label })),
];
const stageFilterOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los estados' },
  ...Object.entries(stageLabels).map(([value, label]) => ({ value, label })),
];
const stageEditOptions: SelectOption[] = Object.entries(stageLabels).map(([value, label]) => ({ value, label }));
const sortOptions: SelectOption[] = [
  { value: 'score', label: 'Mayor prioridad' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'name', label: 'Nombre A–Z' },
];

function StackIcon() {
  return (
    <svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14.034 3.01494C12.1406 3.11033 11.0349 3.65594 9.60407 3.92693C8.29607 4.17625 6.77488 4.09676 4.51947 3.1349C4.15525 4.13867 4.42986 5.24 5.3404 6.13898C7.38552 7.49396 9.52458 7.78303 11.2662 7.44338L11.483 8.72971C9.13435 9.19943 6.37958 11.5336 4.98847 13.0945C5.95683 13.0006 6.97866 12.9789 7.93474 13.0295C8.71521 13.0729 9.43786 13.1596 10.0521 13.3186C10.6664 13.4703 11.1867 13.6365 11.5625 14.1063L12.2056 14.9012L11.2084 15.1397C6.76042 16.2164 3.58724 18.2543 1.95187 20.3789C4.8938 20.1404 7.66013 20.1694 10.2761 21.0076C9.69079 22.7854 8.9031 24.5992 8.03591 26.059C7.33493 27.7717 6.76259 28.6822 6.24372 29.3254C6.29431 29.311 6.33695 29.311 6.3897 29.2965C7.09068 29.152 7.97087 28.8701 8.82361 28.5522C10.5218 27.9162 12.0972 27.1647 12.0972 27.1647L13.2174 26.6299L13.0222 27.8512C12.7332 29.6795 12.7115 31.0381 12.8922 31.9703C13.0728 32.9026 13.4052 33.3795 13.8677 33.6686C14.3375 33.9504 15.024 34.066 15.9634 33.9649C16.7511 33.8854 17.6978 33.6541 18.7601 33.3217C17.9869 30.9225 16.7439 28.5522 16.8884 25.4303C16.9968 23.0094 18.0808 20.35 20.7908 19.0998C24.6353 17.3365 28.8412 18.6012 33.3289 19.2516C33.3361 19.2516 33.3217 19.2516 33.3361 19.2444C33.3939 19.201 33.524 19.0854 33.6541 18.8975C33.9142 18.5289 34.2105 17.9291 34.4562 17.2426C34.5502 16.9824 34.6369 16.7151 34.7164 16.4404C33.8275 16.426 33.1916 16.4404 32.5773 16.043C32.2015 15.7973 31.9342 15.4143 31.7246 14.9518C31.3994 14.1135 31.2549 13.5643 31.0381 12.791C30.0625 12.7621 29.0435 12.8705 28.1547 12.6176C27.0129 12.2924 26.2324 11.1506 25.9506 10.11C25.7338 9.27892 25.6543 8.58517 24.7004 7.61682C21.0365 5.16846 17.8134 2.77213 14.034 3.01494ZM19.0347 9.32228C21.5207 10.9121 23.3996 11.9961 25.6326 12.5815C23.6814 13.3403 20.8342 13.716 19.3383 12.7404C18.8035 12.3285 18.6662 11.0061 19.0347 9.32228ZM5.94093 10.3123C4.90681 10.6014 3.6465 10.8326 1.83624 10.9555V14.8651L2.88337 13.5715C3.74984 12.502 4.71603 11.3674 5.94093 10.3123ZM32.8881 12.8994C33.6758 13.3908 34.4562 13.7738 35.1355 14.2869C35.1644 13.9112 35.1717 13.5643 35.15 13.268C34.4345 13.0078 33.5601 12.95 32.8881 12.8994ZM3.52798 14.6194L1.83624 14.9879V18.5289C3.48462 16.8668 5.89757 15.4287 8.94646 14.4315C7.18968 14.2291 5.2414 14.258 3.52798 14.6194ZM24.7076 19.5406C24.8521 20.1188 24.9172 21.0149 24.9533 21.5569C25.6759 21.0293 26.2107 20.191 26.6732 19.5912C25.9795 19.5334 25.3435 19.519 24.7076 19.5406ZM28.834 19.8514C28.5883 21.6797 27.8584 23.5875 27.0201 25.4664C26.2613 27.1647 25.4158 28.8268 24.7148 30.3227C25.9506 29.3977 27.3742 27.9524 28.6027 26.3047C30.0625 24.3535 31.2549 22.135 31.7535 20.3283C30.7418 20.1621 29.7734 19.9959 28.834 19.8514ZM4.59173 21.4918C3.62337 21.499 2.67019 21.5785 1.83624 21.7158V30.5467C2.13325 30.0047 2.46134 29.4266 2.83134 28.8268C3.48462 27.7789 4.2304 26.7238 5.03327 25.8928C5.7646 25.1412 6.55013 24.5342 7.45779 24.4258C7.86247 23.667 8.25271 22.8215 8.59958 21.882C7.45056 21.6074 6.00525 21.4846 4.59173 21.4918ZM22.6914 28.5377L19.2877 30.843C19.4683 31.3488 19.6562 31.8547 19.8297 32.375C20.8992 31.1104 21.8892 29.8385 22.6914 28.5377Z" fill="#FF7B00" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.1485 9.37344C10.9781 9.28594 10.1297 8.87031 9.9719 8.81406C9.81409 8.75469 9.69846 8.72656 9.5844 8.90156C9.46877 9.075 9.14065 9.46094 9.03752 9.57812C8.93752 9.69375 8.83596 9.70781 8.66565 9.62187C7.65315 9.11562 6.98909 8.71875 6.3219 7.57344C6.14534 7.26875 6.49846 7.29063 6.82815 6.63281C6.8844 6.51719 6.85627 6.41875 6.81252 6.33125C6.76877 6.24375 6.42502 5.39687 6.28127 5.05156C6.14221 4.71562 5.99846 4.7625 5.89377 4.75625C5.79377 4.75 5.67971 4.75 5.56409 4.75C5.44846 4.75 5.26252 4.79375 5.10471 4.96406C4.9469 5.1375 4.50159 5.55469 4.50159 6.40156C4.50159 7.24844 5.11877 8.06875 5.20315 8.18437C5.29065 8.3 6.41721 10.0375 8.1469 10.7859C9.24065 11.2578 9.66877 11.2984 10.2156 11.2172C10.5485 11.1672 11.2344 10.8016 11.3766 10.3969C11.5188 9.99375 11.5188 9.64844 11.4766 9.57656C11.4344 9.5 11.3188 9.45625 11.1485 9.37344Z" fill="white" />
      <path d="M14.4563 5.2875C14.1032 4.44844 13.5969 3.69531 12.9516 3.04844C12.3063 2.40313 11.5532 1.89531 10.7125 1.54375C9.85315 1.18281 8.94065 1 8.00003 1H7.96878C7.0219 1.00469 6.10472 1.19219 5.24222 1.56094C4.4094 1.91719 3.66253 2.42344 3.02347 3.06875C2.3844 3.71406 1.88284 4.46406 1.53597 5.3C1.17659 6.16563 0.99534 7.08594 1.00003 8.03281C1.00472 9.11719 1.26409 10.1938 1.75003 11.1562V13.5312C1.75003 13.9281 2.0719 14.25 2.46878 14.25H4.84534C5.80784 14.7359 6.8844 14.9953 7.96878 15H8.00159C8.93753 15 9.84534 14.8188 10.7 14.4641C11.536 14.1156 12.2875 13.6156 12.9313 12.9766C13.5766 12.3375 14.0844 11.5906 14.4391 10.7578C14.8078 9.89531 14.9953 8.97813 15 8.03125C15.0047 7.07969 14.8203 6.15625 14.4563 5.2875ZM12.0953 12.1313C11 13.2156 9.5469 13.8125 8.00003 13.8125H7.97346C7.03128 13.8078 6.09534 13.5734 5.26878 13.1328L5.13753 13.0625H2.93753V10.8625L2.86722 10.7312C2.42659 9.90469 2.19222 8.96875 2.18753 8.02656C2.18128 6.46875 2.77659 5.00625 3.86878 3.90469C4.9594 2.80312 6.41722 2.19375 7.97503 2.1875H8.00159C8.78284 2.1875 9.54065 2.33906 10.2547 2.63906C10.9516 2.93125 11.5766 3.35156 12.1141 3.88906C12.65 4.425 13.0719 5.05156 13.3641 5.74844C13.6672 6.47031 13.8188 7.23594 13.8157 8.02656C13.8063 9.58281 13.1953 11.0406 12.0953 12.1313Z" fill="white" />
    </svg>
  );
}

function GmailIcon({ width = 18, height = 15 }: { width?: number; height?: number }) {
  const uid = useId();
  const clipId = `gmail-clip-${uid}`;
  const paint0Id = `gmail-paint0-${uid}`;
  const paint1Id = `gmail-paint1-${uid}`;
  return (
    <svg width={width} height={height} viewBox="0 0 64 51" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath={`url(#${clipId})`}>
        <path d="M50.1817 6.54541H63.9998V46.5453C63.9998 48.9551 62.046 50.9089 59.6362 50.9089H52.3635C51.7849 50.9089 51.2299 50.679 50.8207 50.2698C50.4116 49.8607 50.1817 49.3057 50.1817 48.7271V6.54541Z" fill={`url(#${paint0Id})`} />
        <path d="M13.8182 6.54547H0V46.5455C0 48.955 1.954 50.909 4.36375 50.909H11.6362C11.9228 50.909 12.2066 50.8526 12.4713 50.7429C12.7361 50.6333 12.9766 50.4726 13.1792 50.27C13.3819 50.0673 13.5426 49.8268 13.6522 49.562C13.7619 49.2973 13.8183 49.0135 13.8182 48.727V6.54547Z" fill="#FC413D" />
        <path d="M11.3549 1.6204C8.43386 -0.834867 4.07569 -0.457413 1.62043 2.46367C-0.834837 5.38438 -0.457384 9.74255 2.4637 12.1982L30.1283 35.4523C30.6525 35.8929 31.3154 36.1345 32.0001 36.1345C32.6849 36.1345 33.3477 35.8929 33.8719 35.4523L61.5366 12.1978C64.4573 9.74255 64.8347 5.38438 62.3795 2.4633C59.9242 -0.457414 55.566 -0.834867 52.6453 1.6204L32 18.9745L11.3549 1.6204Z" fill={`url(#${paint1Id})`} />
      </g>
      <defs>
        <linearGradient id={paint0Id} x1="57.0908" y1="6.54541" x2="57.0908" y2="50.9089" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60D673" />
          <stop offset="0.17" stopColor="#42C868" />
          <stop offset="0.39" stopColor="#0EBC5F" />
          <stop offset="0.62" stopColor="#00A9BB" />
          <stop offset="0.86" stopColor="#3C90FF" />
          <stop offset="1" stopColor="#3186FF" />
        </linearGradient>
        <linearGradient id={paint1Id} x1="6.85631e-05" y1="7.32001" x2="63.9998" y2="7.32001" gradientUnits="userSpaceOnUse">
          <stop offset="0.08" stopColor="#FF63A0" />
          <stop offset="0.3" stopColor="#FC413D" />
          <stop offset="0.5" stopColor="#FC413D" />
          <stop offset="0.65" stopColor="#FC413D" />
          <stop offset="0.72" stopColor="#FC5C30" />
          <stop offset="0.86" stopColor="#FEB10C" />
          <stop offset="0.91" stopColor="#FEC700" />
          <stop offset="0.96" stopColor="#FFDB0F" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="64" height="51" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function GitHubIcon({ size = 18 }: { size?: number }) {
  const uid = useId();
  const clipId = `gh-clip-${uid}`;
  const maskId = `gh-mask-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath={`url(#${clipId})`}>
        <mask id={maskId} style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <path d="M0 0H24V24H0V0Z" fill="white" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <path d="M12 0C5.37 0 0 5.37 0 12C0 17.31 3.435 21.795 8.205 23.385C8.805 23.49 9.03 23.13 9.03 22.815C9.03 22.53 9.015 21.585 9.015 20.58C6 21.135 5.22 19.845 4.98 19.17C4.845 18.825 4.26 17.76 3.75 17.475C3.33 17.25 2.73 16.695 3.735 16.68C4.68 16.665 5.355 17.55 5.58 17.91C6.66 19.725 8.385 19.215 9.075 18.9C9.18 18.12 9.495 17.595 9.84 17.295C7.17 16.995 4.38 15.96 4.38 11.37C4.38 10.065 4.845 8.985 5.61 8.145C5.49 7.845 5.07 6.615 5.73 4.965C5.73 4.965 6.735 4.65 9.03 6.195C9.99 5.925 11.01 5.79 12.03 5.79C13.05 5.79 14.07 5.925 15.03 6.195C17.325 4.635 18.33 4.965 18.33 4.965C18.99 6.615 18.57 7.845 18.45 8.145C19.215 8.985 19.68 10.05 19.68 11.37C19.68 15.975 16.875 16.995 14.205 17.295C14.64 17.67 15.015 18.39 15.015 19.515C15.015 21.12 15 22.41 15 22.815C15 23.13 15.225 23.505 15.825 23.385C18.2072 22.5807 20.2772 21.0497 21.7437 19.0074C23.2101 16.965 23.9993 14.5143 24 12C24 5.37 18.63 0 12 0Z" fillRule="evenodd" clipRule="evenodd" fill="black" />
        </g>
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function SelectMenu({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  compact = false,
  align = 'start',
  className = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  compact?: boolean;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [optionQuery, setOptionQuery] = useState('');
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const visibleOptions = options.filter(option => `${option.label} ${option.value}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(optionQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
  const selectedIndex = Math.max(0, visibleOptions.findIndex(option => option.value === value));
  const selectedLabel = options.find(option => option.value === value)?.label ?? value;

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;
    setHighlighted(selectedIndex);
    const frame = requestAnimationFrame(() => {
      const item = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
      item?.scrollIntoView({ block: 'nearest' });
    });
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, selectedIndex]);

  function moveHighlight(nextIndex: number) {
    if (!visibleOptions.length) return;
    const bounded = (nextIndex + visibleOptions.length) % visibleOptions.length;
    setHighlighted(bounded);
    requestAnimationFrame(() => {
      const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      items?.[bounded]?.scrollIntoView({ block: 'nearest' });
    });
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(highlighted + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(highlighted - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      const target = visibleOptions[highlighted];
      if (target) onChange(target.value);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} className={`custom-select ${compact ? 'compact' : ''} ${open ? 'open' : ''} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => { setOptionQuery(''); setOpen(current => !current); }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={compact ? 15 : 16} className="select-chevron" />
      </button>
      {open && (
        <div
          ref={listRef}
          className={`select-popover ${align === 'end' ? 'align-end' : ''}`.trim()}
        >
          {options.length > 30 && <div className="country-search"><input aria-label="Buscar país" placeholder="Buscar país…" value={optionQuery} onChange={event => { setOptionQuery(event.target.value); setHighlighted(0); }} /></div>}
          {!visibleOptions.length && <p className="country-empty">No se encontraron países.</p>}
          <div id={listboxId} role="listbox" aria-label={ariaLabel}>
          {visibleOptions.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value || `__empty_${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                className={`select-option ${isSelected ? 'selected' : ''} ${highlighted === index ? 'highlighted' : ''}`.trim()}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={15} className="select-check" />}
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `No se pudo completar la solicitud (HTTP ${response.status}).`);
  if (!data) throw new Error('El servidor devolvió una respuesta vacía. Vuelve a intentarlo.');
  return data;
}

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Cancelado', 'AbortError'));
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelado', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

function priorityTone(score: number | null) {
  if (score === null) return 'priority-medium';
  if (score >= 35) return 'priority-high';
  if (score >= 15) return 'priority-medium';
  return 'priority-low';
}

function SiteCover({ site, large = false }: { site: Audit; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [site.previewImage]);
  return (
    <div className={`site-cover ${large ? 'large' : ''}`}>
      {site.previewImage && !failed ? (
        <>
          <img src={site.previewImage} alt={`Imagen publicada por ${site.name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
          <span className="image-caption">Imagen del sitio</span>
        </>
      ) : (
        <div className="domain-cover">
          <Globe2 size={30} strokeWidth={1.4} />
          <strong>{site.domain}</strong>
          <span>Sin imagen pública</span>
        </div>
      )}
    </div>
  );
}

export default function Workspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const detailId = pathname.startsWith('/web/') ? pathname.split('/')[2] : null;
  const homeScroll = useRef(0);
  const discoveryCursor = useRef<Record<string, number>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [section, setSection] = useState<Section>('results');
  const [sites, setSites] = useState<Audit[]>([]);
  const [saved, setSaved] = useState<Prospect[]>([]);
  const [options, setOptions] = useState<SearchOptions>(defaultOptions);
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [threshold, setThreshold] = useState('35');
  const [issueType, setIssueType] = useState('all');
  const [contactOnly, setContactOnly] = useState(false);
  const [stage, setStage] = useState('all');
  const [localQuery, setLocalQuery] = useState('');
  const [sort, setSort] = useState('score');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [githubStars, setGithubStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ScanProgress>({ round: 0, found: 0, done: 0, failed: 0, phase: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [drawerTab, setDrawerTab] = useState<'audit' | 'contact' | 'notes'>('audit');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sender, setSender] = useState('Stack');
  const [messageLang, setMessageLang] = useState<'es' | 'web'>('es');
  const [esMessage, setEsMessage] = useState('');
  const [webMessage, setWebMessage] = useState('');
  const [webSubject, setWebSubject] = useState('');
  const [pageSpeed, setPageSpeed] = useState(false);
  const [focusIssue, setFocusIssue] = useState('');
  const controller = useRef<AbortController | null>(null);
  const translateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextAuditAt = useRef(0);
  const resultsRef = useRef<Audit[]>([]);
  const mounted = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = detailId ? sites.find(site => site.id === detailId) || saved.find(site => site.id === detailId) || null : null;
  const targetLang = useMemo(() => selected ? resolveSiteLanguage(selected) : 'es', [selected]);

  useEffect(() => {
    mounted.current = true;
    try { const stored = localStorage.getItem(SAVED_KEY); if (stored) setSaved(parseImport(stored).filter(site => !site.demo)); }
    catch { setToast('No se pudieron leer los guardados. Puedes importar una copia JSON.'); }
    try { const stored = localStorage.getItem(RESULTS_KEY); if (stored) { const items = parseImport(stored).filter(site => !site.demo); resultsRef.current = items; setSites(items); } }
    catch { setToast('No se pudieron restaurar los resultados anteriores.'); }
    try {
      const stored = JSON.parse(localStorage.getItem(OPTIONS_KEY) || 'null');
      if (stored && typeof stored.query === 'string' && countries.some(([code]) => code === stored.country) && categories.includes(stored.category)) setOptions({ query: stored.query.slice(0, 200), country: stored.country, category: stored.category });
      setSender(localStorage.getItem('stack-sender') || 'Stack');
    } catch { /* Defaults remain usable when preferences are unavailable. */ }
    try {
      const state = JSON.parse(sessionStorage.getItem('stack-workspace-v1') || 'null');
      if (state) {
        if (state.section === 'saved' || state.section === 'results') setSection(state.section);
        if (['0', '15', '35', '65'].includes(state.threshold)) setThreshold(state.threshold);
        if (['all', 'design', 'content'].includes(state.issueType) || Object.hasOwn(issueLabels, state.issueType)) setIssueType(state.issueType);
        if (typeof state.contactOnly === 'boolean') setContactOnly(state.contactOnly);
        if (state.stage === 'all' || Object.hasOwn(stageLabels, state.stage)) setStage(state.stage);
        if (typeof state.localQuery === 'string') setLocalQuery(state.localQuery.slice(0, 200));
        if (['score', 'recent', 'name'].includes(state.sort)) setSort(state.sort);
        if (state.view === 'grid' || state.view === 'list') setView(state.view);
        if (Number.isFinite(state.scroll)) homeScroll.current = Math.max(0, state.scroll);
        if (state.hasSearched === true) setHasSearched(true);
        if (state.cursors && typeof state.cursors === 'object') {
          discoveryCursor.current = Object.fromEntries(Object.entries(state.cursors).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0 && Number(value) < 60)) as Record<string, number>;
        }
      }
    } catch { /* The in-memory workspace remains available without browser storage. */ }
    setHydrated(true);
    const configController = new AbortController();
    fetch('/api/config', { headers: { 'X-Stack-Client': '1' }, signal: configController.signal }).then(readResponse<Config>).then(value => { if (mounted.current) setConfig(value); }).catch(() => {});
    try {
      const cachedStars = Number(sessionStorage.getItem('stack-repo-stars-v1'));
      if (Number.isInteger(cachedStars) && cachedStars >= 0 && sessionStorage.getItem('stack-repo-stars-v1') !== null) {
        setGithubStars(cachedStars);
      } else {
        fetch('https://api.github.com/repos/ChemixX1/Stack-Busqueda-Inteligente', { signal: configController.signal })
          .then(res => res.ok ? res.json() : null)
          .then(repo => {
            if (!Number.isInteger(repo?.stargazers_count) || repo.stargazers_count < 0 || !mounted.current) return;
            const total = repo.stargazers_count;
            setGithubStars(total);
            try { sessionStorage.setItem('stack-repo-stars-v1', String(total)); } catch {}
          })
          .catch(() => {});
      }
    } catch {}
    return () => { mounted.current = false; configController.abort(); controller.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }
    catch { setToast('No queda espacio local. Exporta tus guardados para conservarlos.'); }
  }, [saved, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch { /* Search still works without storage. */ }
  }, [options, hydrated]);

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); }, [toast]);

  useEffect(() => {
    if (!settingsOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button, input, textarea, a[href]')?.focus(), 10);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
      if (event.key !== 'Tab') return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]') || []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [settingsOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [mobileNavOpen]);

  function requestLiveTranslation(spanishText: string, lang: string, siteName: string) {
    if (!spanishText.trim() || lang === 'es') return;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Stack-Client': '1' },
      body: JSON.stringify({ text: spanishText, target: lang }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (mounted.current && typeof data?.translatedText === 'string' && data.translatedText.trim()) {
          setWebMessage(data.translatedText);
        }
      })
      .catch(() => {});

    if (!hasNativeTemplate(lang)) {
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Stack-Client': '1' },
        body: JSON.stringify({ text: `Una idea para la web de ${businessName(siteName)}`, target: lang }),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (mounted.current && typeof data?.translatedText === 'string' && data.translatedText.trim()) {
            setWebSubject(data.translatedText);
          }
        })
        .catch(() => {});
    }
  }

  function buildDraftsForSite(site: Audit, currentSender: string, issueId = '') {
    const issue = issueId ? site.issues.find(item => item.id === issueId) : undefined;
    const scopedSite = issue ? { ...site, issues: [issue] } : site;
    const lang = resolveSiteLanguage(site);
    const nextEs = contactMessage(scopedSite, currentSender);
    const nextWeb = lang === 'es' ? nextEs : localizedContactMessage(scopedSite, currentSender, lang);
    const nextSub = localizedEmailSubject(site.name, lang);
    setEsMessage(nextEs);
    setWebMessage(nextWeb);
    setWebSubject(nextSub);
    if (lang !== 'es' && !hasNativeTemplate(lang)) {
      requestLiveTranslation(nextEs, lang, site.name);
    }
  }

  // Shared layout keeps results, filters and in-flight discovery mounted between routes.
  useEffect(() => {
    if (!hydrated || detailId) return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: homeScroll.current, behavior: 'instant' }));
    const remember = () => { homeScroll.current = window.scrollY; };
    window.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', remember); };
  }, [hydrated, detailId]);

  useEffect(() => {
    if (!hydrated) return;
    const persist = () => {
      try { sessionStorage.setItem('stack-workspace-v1', JSON.stringify({ section, threshold, issueType, contactOnly, stage, localQuery, sort, view, hasSearched, scroll: homeScroll.current, cursors: discoveryCursor.current })); } catch { /* Session cache is optional. */ }
    };
    persist();
    window.addEventListener('pagehide', persist);
    return () => window.removeEventListener('pagehide', persist);
  }, [hydrated, section, threshold, issueType, contactOnly, stage, localQuery, sort, view, hasSearched, detailId, busy]);

  useEffect(() => {
    if (!selected) return;
    setFocusIssue('');
    setMessageLang('es');
    buildDraftsForSite(selected, sender);
    // Initialize only when entering another record; edited drafts survive tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  function persistResults(items: Audit[]) {
    resultsRef.current = items;
    setSites(items);
    try { localStorage.setItem(RESULTS_KEY, JSON.stringify(items)); }
    catch { setToast('No queda espacio local. Exporta los resultados para conservarlos.'); }
  }

  async function discover(input: SearchOptions) {
    if (controller.current || !hydrated) return;
    setHasSearched(true);
    const scan = new AbortController();
    controller.current = scan;
    const signal = scan.signal;
    setBusy(true); setError(''); setNotice(''); setSection('results'); setLocalQuery('');
    const state: ScanProgress = { round: 0, found: 0, done: 0, failed: 0, phase: 'Buscando webs…' };
    const searchKey = JSON.stringify(input);
    const startOffset = discoveryCursor.current[searchKey] || 0;
    const seen = new Set<string>();
    let cachedCount = 0;
    let completed = 0;
    let firstFailure = '';
    let providerWarning = '';
    const update = () => { if (mounted.current && !signal.aborted) setProgress({ ...state }); };
    update();
    try {
      for (let round = 0; round < 6 && !signal.aborted; round++) {
        state.round = round + 1; state.phase = 'Buscando webs…'; update();
        const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stack-Client': '1' }, body: JSON.stringify({ ...input, limit: 8, offset: (startOffset + round) % 60 }), signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]) });
        const search = await readResponse<SearchResult>(response);
        discoveryCursor.current[searchKey] = (startOffset + round + 1) % 60;
        if (signal.aborted) break;
        if (search.warning) providerWarning = search.warning;
        const resolvedCategory = search.category || input.category;
        const candidates = search.results.filter(candidate => {
          try { const host = new URL(candidate.url).hostname.replace(/^www\./, ''); if (seen.has(host)) return false; seen.add(host); return true; }
          catch { return false; }
        }).slice(0, 8);
        state.found += candidates.length; state.phase = 'Revisando webs y contactos…'; update();
        const queue = [...candidates];
        async function worker() {
          while (queue.length && !signal.aborted) {
            const candidate = queue.shift()!;
            try {
              const candidateHost = new URL(candidate.url).hostname.replace(/^www\./, '');
              const cached = resultsRef.current.find(site => site.domain === candidateHost && canReuseAudit(site));
              if (cached && (!pageSpeed || cached.metrics.performance !== null)) { cachedCount++; continue; }
              const now = Date.now();
              const waitMs = Math.max(0, nextAuditAt.current - now);
              nextAuditAt.current = Math.max(now, nextAuditAt.current) + 2200;
              await pause(waitMs, signal);
              const audit = await readResponse<Audit>(await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Stack-Client': '1' }, body: JSON.stringify({ url: candidate.url, country: input.country, category: resolvedCategory, usePageSpeed: pageSpeed && !!config?.pageSpeedConfigured }), signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]) }));
              if (signal.aborted || !mounted.current) return;
              const domainKey = audit.domain.replace(/^www\./, '');
              const rest = resultsRef.current.filter(site => site.domain.replace(/^www\./, '') !== domainKey && site.id !== audit.id);
              persistResults([audit, ...rest].slice(0, 1000));
              setSaved(previous => previous.map(prospect => prospect.id === audit.id || prospect.domain === audit.domain ? { ...audit, saved: true, stage: prospect.stage, note: prospect.note } : prospect));
              completed++;
            } catch (failure) {
              if (signal.aborted) return;
              state.failed++;
              if (!firstFailure) firstFailure = failure instanceof Error ? failure.message : 'Error durante la revisión.';
            } finally { if (!signal.aborted) { state.done++; update(); } }
          }
        }
        await Promise.all([worker(), worker(), worker()]);
        if (round < 5) await pause(800, signal);
      }
      if (mounted.current && !signal.aborted) setNotice(state.found === 0 ? 'No se encontraron webs para esta búsqueda. Prueba otro rubro o una ciudad.' : `${completed} webs revisadas${cachedCount ? ` · ${cachedCount} recuperadas de caché` : ''}${state.failed ? ` · ${state.failed} revisiones fallidas. ${firstFailure}` : ''}.${providerWarning ? ` ${providerWarning}` : ''}`);
    } catch (failure) {
      if (mounted.current && !signal.aborted) setError(`${failure instanceof Error ? failure.message : 'No se pudo completar la búsqueda.'}${completed ? ` Se conservaron ${completed} revisiones de esta búsqueda.` : ''}`);
    } finally {
      if (controller.current === scan) controller.current = null;
      if (mounted.current) { setBusy(false); if (signal.aborted) setNotice(`Búsqueda detenida. Se conservaron ${completed} revisiones de esta búsqueda.`); }
    }
  }

  const activeSet: Prospect[] = section === 'results' ? sites : saved;
  const filtered = useMemo(() => activeSet.filter(site => {
    const min = Number(threshold);
    return (!min || site.score !== null && site.score >= min)
      && (issueType === 'all' || site.issues.some(issue => issueType === 'design' ? designIssues.has(issue.id) : issueType === 'content' ? contentIssues.has(issue.id) : issue.category === issueType))
      && (!contactOnly || site.contacts.length > 0)
      && (section !== 'saved' || stage === 'all' || (site.stage || 'new') === stage)
      && `${site.name} ${site.domain} ${site.category} ${countryName(site.country)}`.toLowerCase().includes(localQuery.toLowerCase());
  }).sort((a, b) => sort === 'recent' ? Date.parse(b.checkedAt) - Date.parse(a.checkedAt) : sort === 'name' ? a.name.localeCompare(b.name) : (b.score ?? -1) - (a.score ?? -1)), [activeSet, threshold, issueType, contactOnly, section, stage, localQuery, sort]);
  const savedIds = useMemo(() => new Set(saved.map(site => site.id)), [saved]);
  const currentProspect = saved.find(site => site.id === selected?.id);
  const selectedContacts = useMemo(() => selected ? uniqueContacts(selected.contacts, selected.country) : [], [selected]);
  const displayedMessage = messageLang === 'es' ? esMessage : webMessage;
  const outboundMessage = targetLang === 'es' ? esMessage : webMessage;
  const outboundSubject = targetLang === 'es' ? undefined : webSubject;
  const email = selectedContacts.find(contact => contact.type === 'email');
  const phone = selectedContacts.find(contact => contact.type === 'whatsapp') || selectedContacts.find(contact => contact.type === 'phone');
  const wa = selected && phone ? contactWhatsappUrl(phone.value, outboundMessage, selected.country) : null;
  const focusIssueOptions = useMemo<SelectOption[]>(() => selected ? [{ value: '', label: 'El de mayor prioridad' }, ...selected.issues.map(issue => ({ value: issue.id, label: issue.title }))] : [], [selected]);

  function navigate(next: Section) { if (detailId) router.push('/'); setSection(next); setLocalQuery(''); setStage('all'); setThreshold(next === 'saved' ? '0' : '35'); setIssueType('all'); setContactOnly(false); }
  function goHome() {
    homeScroll.current = 0;
    setMobileFiltersOpen(false);
    if (section !== 'results') {
      setSection('results');
      setLocalQuery('');
      setStage('all');
      setThreshold('35');
      setIssueType('all');
      setContactOnly(false);
    }
    if (!detailId) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function openDetail(site: Audit, tab: typeof drawerTab = 'audit') {
    homeScroll.current = window.scrollY;
    setDrawerTab(tab);
    setFocusIssue('');
    setMessageLang('es');
    buildDraftsForSite(site, sender);
    router.push('/web/' + encodeURIComponent(site.id));
  }
  function handleMessageEdit(nextValue: string) {
    if (messageLang === 'es') {
      setEsMessage(nextValue);
      if (targetLang === 'es') {
        setWebMessage(nextValue);
      } else if (selected) {
        if (translateTimer.current) clearTimeout(translateTimer.current);
        const currentSiteName = selected.name;
        const lang = targetLang;
        translateTimer.current = setTimeout(() => requestLiveTranslation(nextValue, lang, currentSiteName), 420);
      }
    } else {
      setWebMessage(nextValue);
    }
  }
  function handleSendAction() {
    if (targetLang !== 'es' && messageLang !== 'web') {
      setMessageLang('web');
    }
  }
  function toggleSave(site: Audit) { setSaved(previous => previous.some(item => item.id === site.id) ? previous.filter(item => item.id !== site.id) : [{ ...site, saved: true, stage: 'new', note: '' }, ...previous]); }
  function updateProspect(site: Audit, patch: Partial<Prospect>) { setSaved(previous => previous.some(item => item.id === site.id) ? previous.map(item => item.id === site.id ? { ...item, ...patch } : item) : [{ ...site, saved: true, stage: 'new', ...patch }, ...previous]); }
  function resetFilters() { setThreshold('0'); setIssueType('all'); setContactOnly(false); setLocalQuery(''); setStage('all'); }
  function exportData(format: 'csv' | 'json') {
    const items = format === 'json' ? saved : filtered;
    if (!items.length) { setToast('No hay resultados para exportar.'); return; }
    downloadFile(`stack-${new Date().toISOString().slice(0, 10)}.${format}`, format === 'csv' ? csvFile(items) : JSON.stringify({ version: 1, prospects: items }, null, 2), format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json');
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error('El archivo supera los 10 MB.');
      const items = parseImport(await file.text()).filter(site => !site.demo);
      setSaved(previous => Array.from(new Map([...items, ...previous].map(site => [site.id, site])).values()));
      navigate('saved'); setToast(`${items.length} fichas importadas.`);
    } catch (failure) { setToast(failure instanceof Error ? failure.message : 'No se pudo importar el archivo.'); }
    if (fileRef.current) fileRef.current.value = '';
  }
  async function copyMessage() { try { await navigator.clipboard.writeText(displayedMessage); setToast('Mensaje copiado.'); } catch { setToast('Selecciona el texto y cópialo manualmente.'); } }

  return (
    <div className={`app-shell ${mobileNavOpen ? 'mobile-nav-open' : ''}`.trim()}>
      <header className={`app-header ${detailId ? 'detail-header' : ''}`.trim()}>
        <Link className="brand" href="/" aria-label="Stack inicio" onClick={goHome}>
          <StackIcon />
          <span>Stack</span>
        </Link>
        <nav aria-label="Navegación principal">
          <button className={section === 'results' ? 'active' : ''} onClick={() => navigate('results')}>
            <Search size={17} />
            Webs encontradas
            <span>{sites.length}</span>
          </button>
          <button className={section === 'saved' ? 'active' : ''} onClick={() => navigate('saved')}>
            <Bookmark size={17} />
            Guardados
            <span>{saved.length}</span>
          </button>
        </nav>
        <div className="header-actions">
          <a className="github-badge" href="https://github.com/ChemixX1/Stack-Busqueda-Inteligente" target="_blank" rel="noopener noreferrer" aria-label="Repositorio de Stack en GitHub">
            <GitHubIcon size={18} />
            <span className="github-label">Github</span>
            <span className="github-stars">
              <Star size={14} fill="currentColor" />
              <span>{githubStars}</span>
            </span>
          </a>
          <button
            className="icon-button"
            aria-label="Menú y ajustes"
            aria-expanded={mobileNavOpen}
            onClick={() => {
              if (window.matchMedia('(max-width: 580px)').matches) {
                setMobileNavOpen(current => !current);
              } else {
                setSettingsOpen(true);
              }
            }}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="mobile-nav-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMobileNavOpen(false); }}>
          <aside className="mobile-nav-drawer" aria-label="Navegación móvil">
            <div className="mobile-nav-header">
              <Link className="brand" href="/" onClick={() => { setMobileNavOpen(false); goHome(); }}>
                <StackIcon />
                <span>Stack</span>
              </Link>
              <button className="icon-button" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mobile-nav-links">
              <button
                type="button"
                className={`mobile-nav-item ${section === 'results' && !detailId ? 'active' : ''}`.trim()}
                onClick={() => { setMobileNavOpen(false); navigate('results'); }}
              >
                <Search size={18} />
                <span>Webs encontradas</span>
                <strong>{sites.length}</strong>
              </button>
              <button
                type="button"
                className={`mobile-nav-item ${section === 'saved' && !detailId ? 'active' : ''}`.trim()}
                onClick={() => { setMobileNavOpen(false); navigate('saved'); }}
              >
                <Bookmark size={18} />
                <span>Guardados</span>
                <strong>{saved.length}</strong>
              </button>
            </div>
            <div className="mobile-nav-footer">
              <button
                type="button"
                className="mobile-nav-settings"
                onClick={() => { setMobileNavOpen(false); setSettingsOpen(true); }}
              >
                <Settings2 size={18} />
                <span>Ajustes</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <main hidden={!!detailId}>
        <div className="page-heading">
          <h1>{section === 'results' ? 'Buscar proyectos' : 'Guardados'}</h1>
          <div className="heading-actions">
            <button className="text-button" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              <span>Importar</span>
            </button>
            <button className="text-button" disabled={!filtered.length} onClick={() => exportData('csv')}>
              <ArrowDownToLine size={16} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {section === 'results' && (
          <form className="search-panel" onSubmit={event => { event.preventDefault(); void discover(options); }}>
            <label className="search-field">
              <span>Negocio o ciudad</span>
              <div>
                <Search size={18} />
                <input
                  value={options.query}
                  onChange={event => setOptions({ ...options, query: event.target.value })}
                  placeholder="Todos los negocios, o escribe una ciudad…"
                  maxLength={200}
                  disabled={busy}
                />
              </div>
            </label>
            <div className="select-field">
              <span>País</span>
              <SelectMenu
                ariaLabel="País de búsqueda"
                value={options.country}
                options={countryOptions}
                onChange={country => setOptions({ ...options, country })}
                disabled={busy}
              />
            </div>
            <div className="select-field">
              <span>Rubro</span>
              <SelectMenu
                ariaLabel="Rubro de búsqueda"
                value={options.category}
                options={categoryOptions}
                onChange={category => setOptions({ ...options, category })}
                disabled={busy}
              />
            </div>
            {busy ? (
              <button key="stop" className="button stop-button" type="button" onClick={event => { event.preventDefault(); controller.current?.abort(); }}>
                <Square size={14} />
                Detener
              </button>
            ) : (
              <button key="search" className="button primary" disabled={!hydrated} type="submit">
                <Search size={18} />
                {sites.length > 0 ? 'Seguir Buscando' : 'Buscar Webs'}
              </button>
            )}
          </form>
        )}

        {busy && (
          <div className="scan-progress" role="status" aria-live="polite">
            <LoaderCircle size={18} className="spin" />
            <strong>{progress.phase}</strong>
            <span>Ronda {progress.round}/6 · {progress.done}/{progress.found} revisadas</span>
            {section === 'saved' && <button className="text-button" onClick={() => controller.current?.abort()}>Detener</button>}
          </div>
        )}

        {(error || notice) && (
          <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
            <span>{error || notice}</span>
            {error && !busy && <button className="text-button" onClick={() => void discover(options)}>Reintentar</button>}
            <button className="icon-button" aria-label="Cerrar aviso" onClick={() => { setError(''); setNotice(''); }}>
              <X size={17} />
            </button>
          </div>
        )}

        <section className="results-section" aria-label={section === 'results' ? 'Resultados de búsqueda' : 'Negocios guardados'}>
          <div className="results-heading">
            <h2>
              {section === 'results' ? 'Webs encontradas' : 'Negocios guardados'}
              <span>{filtered.length}</span>
            </h2>
            <div className="view-toggle" aria-label="Vista de resultados">
              <button aria-label="Vista de tarjetas" aria-pressed={view === 'grid'} className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}>
                <Grid2X2 size={18} />
              </button>
              <button aria-label="Vista de lista" aria-pressed={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
                <List size={20} />
              </button>
            </div>
          </div>

          <div className={`filter-bar ${mobileFiltersOpen ? 'mobile-open' : ''}`.trim()}>
            <SelectMenu
              compact
              className="filter-select collapsible-filter"
              ariaLabel="Prioridad"
              value={threshold}
              options={thresholdOptions}
              onChange={setThreshold}
            />
            <SelectMenu
              compact
              className="filter-select collapsible-filter"
              ariaLabel="Tipo de problema"
              value={issueType}
              options={issueFilterOptions}
              onChange={setIssueType}
            />
            <label className={`contact-filter collapsible-filter ${contactOnly ? 'checked' : ''}`.trim()}>
              <input type="checkbox" checked={contactOnly} onChange={event => setContactOnly(event.target.checked)} />
              Con contacto
            </label>
            {section === 'saved' && (
              <SelectMenu
                compact
                className="filter-select stage-select collapsible-filter"
                ariaLabel="Estado de contacto"
                value={stage}
                options={stageFilterOptions}
                onChange={setStage}
              />
            )}
            <div className="local-search-row">
              <label className="local-search">
                <Search size={15} />
                <input
                  aria-label="Filtrar resultados"
                  placeholder="Filtrar resultados…"
                  value={localQuery}
                  onChange={event => setLocalQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={`mobile-filter-toggle ${mobileFiltersOpen ? 'active' : ''}`.trim()}
                aria-label={mobileFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen(current => !current)}
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>
            <SelectMenu
              compact
              align="end"
              className="sort-select collapsible-filter"
              ariaLabel="Ordenar resultados"
              value={sort}
              options={sortOptions}
              onChange={setSort}
            />
          </div>

          {filtered.length ? (
            <div className={`site-grid ${view === 'list' ? 'list-view' : ''}`}>
              {filtered.map(site => {
                const cardContacts = uniqueContacts(site.contacts, site.country);
                return (
                <article className="site-card" key={site.id}>
                  <button className="cover-button" aria-label={`Ver diagnóstico de ${site.name}`} onClick={() => openDetail(site)}>
                    <SiteCover site={site} />
                    <span className={`score-badge ${priorityTone(site.score)}`}>
                      <strong>{site.score ?? '—'}</strong>
                      <span>{priority(site.score)}</span>
                    </span>
                  </button>
                  <div className="card-body">
                    <div className="card-title">
                      <div>
                        <button onClick={() => openDetail(site)}>
                          <h3>{site.name}</h3>
                        </button>
                        <a href={site.url} target="_blank" rel="noopener noreferrer">
                          {site.domain}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <button
                        className={`icon-button save-button ${savedIds.has(site.id) ? 'saved' : ''}`}
                        aria-label={savedIds.has(site.id) ? `Quitar ${site.name} de guardados` : `Guardar ${site.name}`}
                        aria-pressed={savedIds.has(site.id)}
                        onClick={() => toggleSave(site)}
                      >
                        <Bookmark size={18} fill={savedIds.has(site.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className="business-meta">
                      {countryName(site.country)}
                      <span>·</span>
                      {site.category}
                    </div>
                    <div className="issue-chips">
                      {site.issues.length
                        ? [...site.issues].sort((a, b) => b.points - a.points).slice(0, 2).map(issue => (
                            <span key={issue.id} className={issue.severity === 'high' ? 'high' : ''}>
                              {issue.title}
                            </span>
                          ))
                        : <span>Sin problemas detectados</span>}
                      {site.issues.length > 2 && <span>+{site.issues.length - 2}</span>}
                    </div>
                    <div className="card-footer">
                      {cardContacts.length > 0 && (
                        <span className="has-contact">
                          <User size={14} />
                          {cardContacts.length === 1 ? '1 contacto' : `${cardContacts.length} contactos`}
                        </span>
                      )}
                      <button className={cardContacts.length === 0 ? 'footer-only-action' : ''} onClick={() => openDetail(site, cardContacts.length ? 'contact' : 'audit')}>
                        {cardContacts.length ? 'Contactar' : 'Ver diagnóstico'}
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {section === 'saved' && <div className="saved-stage">{stageLabels[site.stage || 'new']}</div>}
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div>{busy ? <LoaderCircle size={28} className="spin" /> : section === 'saved' ? <Bookmark size={28} /> : <Search size={28} />}</div>
              <h3>
                {busy
                  ? 'Buscando y revisando webs…'
                  : activeSet.length
                    ? 'No hay webs con estos filtros'
                    : section === 'saved'
                      ? 'Sin negocios guardados'
                      : 'Sin resultados todavía'}
              </h3>
              <p>
                {busy
                  ? 'Los resultados aparecerán aquí a medida que se revisen.'
                  : activeSet.length
                    ? 'Cambia los filtros para ver el resto de las revisiones.'
                    : section === 'saved'
                      ? 'Guarda una web para conservar tus notas y el estado del contacto.'
                      : 'Elige un país y un rubro, y pulsa Buscar Webs para encontrarlas y revisarlas.'}
              </p>
              {!busy && (
                <button
                  className="button secondary"
                  onClick={activeSet.length ? resetFilters : section === 'saved' ? () => navigate('results') : () => void discover(options)}
                >
                  {activeSet.length ? 'Ver todas las revisiones' : section === 'saved' ? 'Ver webs encontradas' : 'Buscar Webs'}
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={event => void importData(event.target.files?.[0])} />

      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="Cerrar notificación" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}

      {detailId && !selected && !hydrated && (
        <main className="detail-page detail-skeleton" aria-busy="true" aria-label="Cargando estructura de la ficha">
          <div className="detail-toolbar">
            <span className="skeleton-box skeleton-back" />
          </div>
          <div className="detail-layout">
            <section className="business-overview">
              <div className="detail-cover-wrap">
                <div className="site-cover large skeleton-box" />
                <div className="skeleton-score skeleton-box" />
              </div>
              <div className="business-summary">
                <span className="skeleton-box skeleton-line skeleton-w35" />
                <span className="skeleton-box skeleton-title skeleton-w80" />
                <span className="skeleton-box skeleton-line skeleton-w45" />
                <div className="skeleton-paragraph">
                  <span className="skeleton-box skeleton-line skeleton-w100" />
                  <span className="skeleton-box skeleton-line skeleton-w70" />
                </div>
                <div className="detail-business-actions">
                  <span className="skeleton-box skeleton-btn" />
                  <span className="skeleton-box skeleton-btn" />
                </div>
              </div>
            </section>
            <section className="detail-findings">
              <div className="drawer-tabs skeleton-tabs">
                <span className="skeleton-box skeleton-tab" />
                <span className="skeleton-box skeleton-tab" />
                <span className="skeleton-box skeleton-tab" />
              </div>
              <div className="audit-metrics">
                <div className="skeleton-metric"><span className="skeleton-box skeleton-line skeleton-w45" /><span className="skeleton-box skeleton-line skeleton-w70" /></div>
                <div className="skeleton-metric"><span className="skeleton-box skeleton-line skeleton-w45" /><span className="skeleton-box skeleton-line skeleton-w70" /></div>
                <div className="skeleton-metric"><span className="skeleton-box skeleton-line skeleton-w45" /><span className="skeleton-box skeleton-line skeleton-w70" /></div>
                <div className="skeleton-metric"><span className="skeleton-box skeleton-line skeleton-w45" /><span className="skeleton-box skeleton-line skeleton-w70" /></div>
              </div>
              <div className="content-metrics">
                <div><span className="skeleton-box skeleton-stat" /><span className="skeleton-box skeleton-stat-label" /></div>
                <div><span className="skeleton-box skeleton-stat" /><span className="skeleton-box skeleton-stat-label" /></div>
                <div><span className="skeleton-box skeleton-stat" /><span className="skeleton-box skeleton-stat-label" /></div>
                <div><span className="skeleton-box skeleton-stat" /><span className="skeleton-box skeleton-stat-label" /></div>
              </div>
              <div className="issues-list">
                <div className="issue-item skeleton-issue"><span className="skeleton-box skeleton-line skeleton-w65" /><span className="skeleton-box skeleton-line skeleton-w100" /><span className="skeleton-box skeleton-line skeleton-w45" /></div>
                <div className="issue-item skeleton-issue"><span className="skeleton-box skeleton-line skeleton-w65" /><span className="skeleton-box skeleton-line skeleton-w100" /><span className="skeleton-box skeleton-line skeleton-w45" /></div>
                <div className="issue-item skeleton-issue"><span className="skeleton-box skeleton-line skeleton-w65" /><span className="skeleton-box skeleton-line skeleton-w100" /><span className="skeleton-box skeleton-line skeleton-w45" /></div>
              </div>
            </section>
          </div>
        </main>
      )}

      {detailId && !selected && hydrated && (
        <main className="empty-state">
          <Globe2 size={32} />
          <h1>Ficha no disponible en este navegador</h1>
          <p>Importa la copia JSON que contiene este negocio o inicia una nueva búsqueda.</p>
        </main>
      )}

      {selected && (
        <main className="detail-page">
          <div className="detail-toolbar">
            <Link className="text-button back-link" href="/" scroll={false}><ArrowLeft size={18} />Volver a {section === 'saved' ? 'guardados' : 'resultados'}</Link>
          </div>
          <div className="detail-layout">
            <section className="business-overview" aria-label="Datos del negocio">
              <div className="detail-cover-wrap">
                <SiteCover site={selected} large />
                <div className={`detail-score ${priorityTone(selected.score)}`}>
                  <strong>{selected.score ?? '—'}</strong>
                  <span>{selected.score === null ? 'Sin evaluar' : `Prioridad ${priority(selected.score).toLowerCase()}`}</span>
                </div>
              </div>
              <div className="business-summary">
                <div className="business-meta">{countryName(selected.country)} · {selected.category}</div>
                <div className="detail-title">
                  <div>
                    <h1 id="detail-title">{selected.name}</h1>
                    <a className="domain-link" href={selected.url} target="_blank" rel="noopener noreferrer">
                      {selected.domain}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <p className="business-description">{selected.description || 'El sitio no publica una descripción.'}</p>

                <div className="detail-business-actions">
                  <a className="button primary" href={selected.url} target="_blank" rel="noopener noreferrer">Visitar web<ArrowUpRight size={17} /></a>
                  <button className={`button secondary ${currentProspect ? 'saved' : ''}`} aria-pressed={!!currentProspect} onClick={() => toggleSave(selected)}><Bookmark size={17} fill={currentProspect ? 'currentColor' : 'none'} />{currentProspect ? 'Guardado' : 'Guardar'}</button>
                </div>
              </div>
            </section>
            <section className="detail-findings" aria-label="Hallazgos y seguimiento">
                <div className="drawer-tabs" role="tablist" aria-label="Información del negocio">
                  {([['audit', 'Hallazgos'], ['contact', 'Contactar'], ['notes', 'Seguimiento']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      id={`tab-${value}`}
                      role="tab"
                      tabIndex={drawerTab === value ? 0 : -1}
                      aria-selected={drawerTab === value}
                      aria-controls={`panel-${value}`}
                      className={drawerTab === value ? 'active' : ''}
                      onClick={() => setDrawerTab(value)}
                      onKeyDown={event => {
                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                        event.preventDefault();
                        const tabs = ['audit', 'contact', 'notes'] as const;
                        const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (tabs.indexOf(value) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                        setDrawerTab(tabs[index]);
                        event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#tab-${tabs[index]}`)?.focus();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {drawerTab === 'audit' && (
                  <div role="tabpanel" id="panel-audit" aria-labelledby="tab-audit" className="audit-panel">
                    <div className="audit-metrics">
                      <div>
                        <span>Estado</span>
                        <strong>{statusLabels[selected.status]}</strong>
                      </div>
                      <div>
                        <span>Respuesta inicial</span>
                        <strong>{selected.metrics.responseMs === null ? 'Sin medir' : `${(selected.metrics.responseMs / 1000).toFixed(2)} s`}</strong>
                      </div>
                      <div>
                        <span>Viewport móvil</span>
                        <strong>{selected.metrics.viewport === null ? 'Sin evaluar' : selected.pageReviews?.length ? selected.metrics.viewport ? 'En todas las páginas evaluables' : 'Falta en alguna página' : selected.metrics.viewport ? 'Presente' : 'Ausente'}</strong>
                      </div>
                      <div>
                        <span>PageSpeed móvil · página inicial</span>
                        <strong>{selected.metrics.performance === null ? 'Sin medir' : `${selected.metrics.performance}/100`}</strong>
                      </div>
                    </div>
                    {selected.metrics.wordCount !== undefined && (
                      <div className="content-metrics" aria-label="Recuentos del HTML de las páginas analizadas; incluyen elementos compartidos entre páginas">
                        <div><strong>{selected.metrics.wordCount.toLocaleString('es-PE')}</strong><span>palabras</span></div>
                        <div><strong>{selected.metrics.linkCount ?? '—'}</strong><span>enlaces</span></div>
                        <div><strong>{selected.metrics.imageCount ?? '—'}</strong><span>imágenes</span></div>
                        <div><strong>{selected.metrics.headingCount ?? '—'}</strong><span>títulos</span></div>
                      </div>
                    )}
                    {selected.pageReviews?.length ? (
                      <details className="site-coverage">
                        <summary>{selected.pageReviews.length} {selected.pageReviews.length === 1 ? 'página analizada' : 'páginas analizadas'}</summary>
                        <p>La prioridad reúne los hallazgos de estas páginas. Cada tipo de problema cuenta una sola vez, con el mayor peso observado. Los recuentos de contenido suman las páginas y pueden incluir elementos compartidos.</p>
                        {selected.crawl && (
                          <p>
                            {selected.crawl.attempted} páginas consultadas · {selected.crawl.failed} sin analizar.
                            {selected.crawl.limited ? ` Se alcanzó el límite de páginas, profundidad o tiempo de esta revisión (máximo ${selected.crawl.limit} páginas). Pueden quedar secciones sin revisar.` : ' Se recorrieron los enlaces internos disponibles dentro del alcance de esta revisión.'}
                          </p>
                        )}
                        <ul>
                          {selected.pageReviews.map(page => (
                            <li key={page.url}>
                              <a href={page.url} target="_blank" rel="noopener noreferrer">{new URL(page.url).host}{new URL(page.url).pathname}{new URL(page.url).search}</a>
                              <span>{page.score === null ? 'Sin puntuación: requiere renderizar JavaScript' : `Prioridad ${page.score}/100`} · {page.metrics.wordCount ?? 0} palabras · {page.issueIds.length} hallazgos</span>
                              <span>Viewport móvil: {page.metrics.viewport === null ? 'sin evaluar' : page.metrics.viewport ? 'presente' : 'ausente'} · H1: {page.metrics.h1 ?? '—'} · Imágenes sin alt: {page.metrics.imageAltMissing ?? '—'}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    <div className="audit-heading">
                      <h2>Hallazgos detectados</h2>
                      <span>{selected.issues.length}</span>
                    </div>
                    <div className="issues-list">
                      {[...selected.issues].sort((a, b) => b.points - a.points).map(issue => (
                        <div className={`issue-item ${issue.severity}`} key={issue.id}>
                          <div>
                            <h4>{issue.title}</h4>
                            <span>{issue.points ? `${issue.points} pts de señal` : issueLabels[issue.category]}</span>
                          </div>
                          <p>{issue.detail}</p>
                          <small>{issueLabels[issue.category]}</small>
                          {issue.sources?.length ? (
                            <details className="issue-pages">
                              <summary>Detectado en {issue.sources.length} {issue.sources.length === 1 ? 'página' : 'páginas'}</summary>
                              <ul>
                                {issue.sources.map(source => (
                                  <li key={source}><a href={source} target="_blank" rel="noopener noreferrer">{new URL(source).host}{new URL(source).pathname}{new URL(source).search}</a></li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                        </div>
                      ))}
                      {!selected.issues.length && <p className="muted">No se detectaron problemas en las comprobaciones disponibles.</p>}
                    </div>
                    {selected.technologies?.length ? (
                      <div className="tech-list">
                        {selected.technologies.map(technology => <span key={technology}>{technology}</span>)}
                      </div>
                    ) : null}
                    <details className="limitations">
                      <summary>
                        Alcance de la revisión
                        <ChevronDown size={15} />
                      </summary>
                      <p>La prioridad combina señales técnicas con un límite por categoría para evitar contar varias veces el mismo problema. El país y rubro corresponden al contexto de búsqueda.</p>
                      {selected.limitations.map((item, index) => <p key={index}>{item}</p>)}
                    </details>
                  </div>
                )}

                {drawerTab === 'contact' && (
                  <div role="tabpanel" id="panel-contact" aria-labelledby="tab-contact" className="contact-panel">
                    <label className="field-label">
                      Tu nombre o estudio
                      <input
                        value={sender}
                        maxLength={80}
                        onChange={event => {
                          const nextSender = event.target.value;
                          setSender(nextSender);
                          buildDraftsForSite(selected, nextSender, focusIssue);
                          try { localStorage.setItem('stack-sender', nextSender); } catch {}
                        }}
                      />
                    </label>
                    {selected.issues.length > 0 && (
                      <div className="field-label">
                        <span>Problema a destacar</span>
                        <SelectMenu
                          ariaLabel="Problema a destacar"
                          value={focusIssue}
                          options={focusIssueOptions}
                          onChange={nextValue => {
                            setFocusIssue(nextValue);
                            buildDraftsForSite(selected, sender, nextValue);
                          }}
                        />
                      </div>
                    )}
                    <div className="field-label">
                      <div className="field-label-row">
                        <label htmlFor="contact-message">Mensaje</label>
                        <div className="message-header-controls">
                          <div className="lang-switch" role="group" aria-label="Idioma del mensaje">
                            <button
                              type="button"
                              className={messageLang === 'es' ? 'active' : ''}
                              aria-pressed={messageLang === 'es'}
                              onClick={() => setMessageLang('es')}
                            >
                              Español
                            </button>
                            <button
                              type="button"
                              className={messageLang === 'web' ? 'active' : ''}
                              aria-pressed={messageLang === 'web'}
                              onClick={() => {
                                setMessageLang('web');
                                if (targetLang !== 'es' && translateTimer.current) {
                                  clearTimeout(translateTimer.current);
                                  translateTimer.current = null;
                                  requestLiveTranslation(esMessage, targetLang, selected.name);
                                }
                              }}
                            >
                              Idioma de la web
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-button copy-inline-button"
                            aria-label="Copiar mensaje"
                            title="Copiar mensaje"
                            onClick={() => void copyMessage()}
                          >
                            <Copy size={15} />
                            <span>Copiar</span>
                          </button>
                        </div>
                      </div>
                      <textarea id="contact-message" dir="auto" rows={8} value={displayedMessage} onChange={event => handleMessageEdit(event.target.value)} />
                    </div>
                    <div className="send-actions">
                      {wa ? (
                        <a className="button primary" href={wa} target="_blank" rel="noopener noreferrer" onClick={handleSendAction}>
                          <WhatsAppIcon size={17} />
                          WhatsApp
                          <ArrowUpRight size={15} />
                        </a>
                      ) : (
                        <button className="button secondary" disabled>Sin WhatsApp</button>
                      )}
                      {email ? (
                        <a className="button secondary" href={emailUrl(email.value, selected.name, outboundMessage, outboundSubject)} onClick={handleSendAction}>
                          <GmailIcon width={18} height={15} />
                          Correo
                          <ArrowUpRight size={15} />
                        </a>
                      ) : (
                        <button className="button secondary" disabled>Sin correo</button>
                      )}
                    </div>
                    <h3 className="contact-title">Contactos públicos</h3>
                    {selectedContacts.length ? (
                      <div className={`contacts-list ${selectedContacts.length > 1 ? 'two-columns' : ''}`.trim()}>
                        {selectedContacts.map((contact, index) => {
                          const isEmail = contact.type === 'email';
                          const contactWa = !isEmail ? contactWhatsappUrl(contact.value, outboundMessage, selected.country) : null;
                          const href = isEmail
                            ? (emailUrl(contact.value, selected.name, outboundMessage, outboundSubject) || `mailto:${encodeURIComponent(contact.value)}`)
                            : (contactWa || `tel:${contact.value.replace(/[^\d+]/g, '')}`);
                          const displayValue = isEmail ? contact.value : formatPhone(contact.value, selected.country);
                          return (
                            <a
                              className="contact-record"
                              key={`${contact.type}-${index}`}
                              href={href}
                              target={!isEmail && contactWa ? '_blank' : undefined}
                              rel={!isEmail && contactWa ? 'noopener noreferrer' : undefined}
                              onClick={handleSendAction}
                            >
                              <span className={isEmail ? 'email-badge' : 'whatsapp-badge'}>
                                {isEmail ? <GmailIcon width={18} height={15} /> : <WhatsAppIcon size={18} />}
                              </span>
                              <div>
                                <strong>{displayValue}</strong>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted">
                        No se encontraron contactos en las páginas revisadas. Pueden existir en otras secciones o cargarse con JavaScript.{' '}
                        <a href={selected.url} target="_blank" rel="noopener noreferrer">Abrir la web</a>
                      </p>
                    )}
                  </div>
                )}

                {drawerTab === 'notes' && (
                  <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes">
                    <div className="field-label">
                      <span>Estado del contacto</span>
                      <SelectMenu
                        ariaLabel="Estado del contacto"
                        value={currentProspect?.stage || 'new'}
                        options={stageEditOptions}
                        onChange={nextStage => updateProspect(selected, { stage: nextStage as Prospect['stage'] })}
                      />
                    </div>
                    <label className="field-label">
                      Notas
                      <textarea
                        rows={7}
                        placeholder="Qué ofrecer, próxima acción, respuesta…"
                        value={currentProspect?.note || ''}
                        onChange={event => updateProspect(selected, { note: event.target.value })}
                      />
                    </label>
                  </div>
                )}
            </section>
          </div>
        </main>
      )}

      {children}

      {settingsOpen && (
        <div className="dialog-backdrop centered" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={dialogRef}>
            <header>
              <h2 id="settings-title">Ajustes</h2>
              <button className="icon-button" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <label className="field-label">
              Tu nombre o estudio
              <input
                value={sender}
                maxLength={80}
                onChange={event => {
                  const nextSender = event.target.value;
                  setSender(nextSender);
                  if (selected) {
                    buildDraftsForSite(selected, nextSender, focusIssue);
                  }
                  try { localStorage.setItem('stack-sender', nextSender); } catch {}
                }}
              />
            </label>
            <div className="connection-row">
              <span>Buscador</span>
              <strong>{config?.searchProvider || 'Búsqueda integrada'}</strong>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={pageSpeed}
                disabled={!config?.pageSpeedConfigured || busy}
                onChange={event => setPageSpeed(event.target.checked)}
              />
              <span>
                Añadir PageSpeed móvil
                <small>{config?.pageSpeedConfigured ? 'La revisión puede tardar más.' : 'Opcional: PAGESPEED_API_KEY en .env.local.'}</small>
              </span>
            </label>
            <div className="settings-actions">
              <button className="button secondary" disabled={!saved.length} onClick={() => exportData('json')}>
                <ArrowDownToLine size={16} />
                Copia de guardados
              </button>
              <button className="button secondary" onClick={() => fileRef.current?.click()}>
                <Upload size={15} />
                Importar JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
