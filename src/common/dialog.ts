export function createFullScreenDialog(element: HTMLElement, title: string, closeCallback: Function = () => {}): HTMLDivElement {
  const dialogContainer = document.createElement('div');
  dialogContainer.className = 'fullScreenDialog';
  let removed = false;

  const originalRemove = dialogContainer.remove.bind(dialogContainer);
  const removeDialog = () => {
    if (removed) return;
    removed = true;
    document.removeEventListener('keydown', handleKeyDown);
    originalRemove();
  };
  const closeDialog = () => {
    removeDialog();
    closeCallback();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('.fullScreenDialog'));
    if (dialogs.at(-1) !== dialogContainer) return;
    event.preventDefault();
    closeDialog();
  };
  dialogContainer.remove = removeDialog;

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = title;
  dialogContainer.appendChild(dialogTitle);
  dialogContainer.appendChild(element);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.className = 'dialogCloseButton';
  closeButton.addEventListener('click', closeDialog);
  const actions = element.querySelector<HTMLElement>('.settingsActions') ?? createDialogActions(dialogContainer);
  actions.appendChild(closeButton);
  document.body.appendChild(dialogContainer);
  document.addEventListener('keydown', handleKeyDown);
  return dialogContainer;
}

function createDialogActions(dialogContainer: HTMLDivElement): HTMLDivElement {
  const actions = document.createElement('div');
  actions.className = 'settingsActions';
  dialogContainer.appendChild(actions);
  return actions;
}
