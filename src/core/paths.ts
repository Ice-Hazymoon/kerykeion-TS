function toPortablePath(url: URL): string {
  const pathname = decodeURIComponent(url.pathname);
  return /^\/[a-z]:/i.test(pathname) ? pathname.slice(1) : pathname;
}

const projectRootUrl = new URL("../..", import.meta.url);
const assetsRootUrl = new URL("assets/", projectRootUrl);

export const projectRoot = toPortablePath(projectRootUrl);
export const assetsRoot = toPortablePath(assetsRootUrl);
export const swephAssetsPath = toPortablePath(new URL("sweph/", assetsRootUrl));
export const chartTemplatesPath = toPortablePath(new URL("chart-templates/", assetsRootUrl));
export const chartThemesPath = toPortablePath(new URL("chart-themes/", assetsRootUrl));
