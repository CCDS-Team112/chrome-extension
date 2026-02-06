(() => {
  const STYLE_ID = "readable-font-standardizer";

  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
:root {
  --rfs-font-size: 40px;
  --rfs-line-height: 1.6;
  --rfs-letter-spacing: 0.01em;
}

html, body, body * {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: var(--rfs-font-size) !important;
  line-height: var(--rfs-line-height) !important;
  letter-spacing: var(--rfs-letter-spacing) !important;
}

code, pre, kbd, samp, textarea, input, select, button {
  font-family: Arial, Helvetica, sans-serif !important;
}
`;

  document.documentElement.appendChild(style);
})();
