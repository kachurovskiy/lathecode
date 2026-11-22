const OPENROUTER_PROVIDER_PRIVACY =
  'Requests deny provider data collection and request zero data retention (ZDR). To exclude Safety Retention, select "ZDR only" for Google and all other models in your OpenRouter privacy settings or guardrail. These filters also apply to retries and provider fallbacks.';

export const OPENROUTER_API_KEY_PRIVACY =
  `Your OpenRouter API key is stored locally in this browser and sent only to OpenRouter when you use an LLM action. ${OPENROUTER_PROVIDER_PRIVACY}`;

export function openRouterActionPrivacyText(sentDataDescription: string): string {
  return `${sentDataDescription} No lathecode server stores it. ${OPENROUTER_PROVIDER_PRIVACY}`;
}

export function createPrivacyDisclosure(text: string): HTMLParagraphElement {
  const disclosure = document.createElement('p');
  disclosure.className = 'privacyDisclosure';
  disclosure.textContent = text;
  disclosure.append(' ', createOpenRouterPrivacyLink());
  return disclosure;
}

export function createOpenRouterPrivacyLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = 'https://openrouter.ai/settings/privacy';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'OpenRouter privacy settings';
  return link;
}
