(function checkHydration() {
  const root = document.querySelector('#root') || document.body;
  
  if (!root) {
    setTimeout(checkHydration, 50);
    return;
  }

  const isHydrated = Object.keys(root).some(key =>
    key.startsWith('__reactFiber$') || key.startsWith('__reactContainer$')
  );

  if (isHydrated) {
    window.postMessage({ type: 'MASHINTED_REACT_HYDRATED' }, '*');
  } else {
    setTimeout(checkHydration, 50);
  }
})();