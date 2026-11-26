try {
  const theme = localStorage.getItem('ip-theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch { /* Use the operating system preference when storage is unavailable. */ }
