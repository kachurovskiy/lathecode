export function createFullScreenDialog(element: HTMLElement, title: string, closeCallback: Function = () => {}): HTMLDivElement {
  const dialogContainer = document.createElement('div');
  dialogContainer.style.position = 'fixed';
  dialogContainer.style.top = '0';
  dialogContainer.style.left = '0';
  dialogContainer.style.width = '100%';
  dialogContainer.style.height = '100%';
  dialogContainer.style.backgroundColor = 'white';
  dialogContainer.style.padding = '12px';

  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = title;
  dialogContainer.appendChild(dialogTitle);

  dialogContainer.appendChild(element);
  element.style.margin = '12px';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.display = 'block';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(dialogContainer);
    closeCallback();
  });
  dialogContainer.appendChild(closeButton);
  document.body.appendChild(dialogContainer);
  return dialogContainer;
}
