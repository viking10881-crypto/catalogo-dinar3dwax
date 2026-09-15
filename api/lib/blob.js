export function esUrlDeNuestroBlob(url) {
  return typeof url === "string" && /\.public\.blob\.vercel-storage\.com\//.test(url);
}
