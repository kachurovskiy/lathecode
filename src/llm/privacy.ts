const OPENROUTER_PROVIDER_PRIVACY =
  'OpenRouter requests require provider endpoints with data collection denied and zero data retention.';

export const OPENROUTER_API_KEY_PRIVACY =
  `Your OpenRouter API key is stored locally in this browser and sent only to OpenRouter when you use an LLM action. ${OPENROUTER_PROVIDER_PRIVACY}`;

export function openRouterActionPrivacyText(sentDataDescription: string): string {
  return `${sentDataDescription} No lathecode server stores it. ${OPENROUTER_PROVIDER_PRIVACY}`;
}

export function createPrivacyDisclosure(text: string): HTMLParagraphElement {
  const disclosure = document.createElement('p');
  disclosure.className = 'privacyDisclosure';
  disclosure.textContent = text;
  return disclosure;
}
