import { get } from 'object-path';
export function indicatorTooltipContent (indicator, lang) {
  const t = get(window.t, [lang, 'map_labels'], {});
  const defaultDescriptionLabel = t.description_default_value;
  const indicatorDescription = lang === 'en' ? indicator.description : indicator.description_ar;
  return `<span class="tooltip__description">${t.description_label} : &nbsp; ${indicatorDescription !== null ? indicatorDescription : defaultDescriptionLabel}</span>` +
    `<span class="tooltip__sources">${t.sources_label}: ${indicator.sources ? indicator.sources.map(item => item[lang] ? item[lang] : defaultDescriptionLabel) : defaultDescriptionLabel}</span>`;
}
