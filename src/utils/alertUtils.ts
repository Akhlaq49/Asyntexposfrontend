/**
 * Alert utility functions for displaying notifications to users
 */

export const showSuccess = (message: string, title: string = 'Success'): Promise<void> => {
  return new Promise((resolve) => {
    // Using browser's native alert for now, can be replaced with SweetAlert2 later
    alert(`${title}: ${message}`);
    resolve();
  });
};

export const showError = (message: string, title: string = 'Error'): Promise<void> => {
  return new Promise((resolve) => {
    alert(`${title}: ${message}`);
    resolve();
  });
};

export const showConfirm = (
  title: string,
  message: string = '',
  ..._rest: string[]
): Promise<{ isConfirmed: boolean }> => {
  return new Promise((resolve) => {
    const confirmed = confirm(`${title}\n${message}`);
    resolve({ isConfirmed: confirmed });
  });
};
