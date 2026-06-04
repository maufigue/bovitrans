try {
  const savedTheme = localStorage.getItem("bovitrans-theme");
  const dark =
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
} catch {}
