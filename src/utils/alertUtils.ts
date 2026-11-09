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

