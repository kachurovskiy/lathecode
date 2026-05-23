export function createFullScreenDialog(element: HTMLElement, title: string, closeCallback: Function = () => {}): HTMLDivElement {
  const dialogContainer = document.createElement('div');
  dialogContainer.className = 'fullScreenDialog';

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = title;
  dialogContainer.appendChild(dialogTitle);
  dialogContainer.appendChild(element);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.className = 'dialogCloseButton';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialogContainer);
    closeCallback();
  });
  const actions = element.querySelector<HTMLElement>('.settingsActions') ?? createDialogActions(dialogContainer);
  actions.appendChild(closeButton);
  document.body.appendChild(dialogContainer);
  return dialogContainer;
}

function createDialogActions(dialogContainer: HTMLDivElement): HTMLDivElement {
  const actions = document.createElement('div');
  actions.className = 'settingsActions';
  dialogContainer.appendChild(actions);
  return actions;
}
