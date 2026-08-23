/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // The public-facing policy pages live on news.dot1.media. The editorial domain is the newsroom
  // back-office and should never be a public destination, so redirect any old /policy/* links to
  // their news.dot1.media equivalents.
  async redirects() {
    const map = {
      standards: "standards",
      corrections: "corrections",
      ownership: "ownership",
      advertising: "advertising",
      contact: "contact",
      tip: "contact",
    };
    return Object.entries(map).map(([from, to]) => ({
      source: `/policy/${from}`,
      destination: `https://news.dot1.media/${to}`,
      permanent: true,
    })).concat([
      { source: "/policy", destination: "https://news.dot1.media/standards", permanent: true },
    ]);
  },
};
export default nextConfig;
