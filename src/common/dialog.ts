export function createFullScreenDialog(element: HTMLElement, title: string, closeCallback: Function = () => {}): HTMLDivElement {
  const dialogContainer = document.createElement('div');
  dialogContainer.className = 'fullScreenDialog';

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = title;
  dialogContainer.appendChild(dialogTitle);
  dialogContainer.appendChild(element);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.className = 'dialogCloseButton';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialogContainer);
    closeCallback();
  });
  dialogContainer.appendChild(closeButton);
  document.body.appendChild(dialogContainer);
  return dialogContainer;
}
