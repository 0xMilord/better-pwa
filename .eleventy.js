/**
 * Eleventy config — better-pwa docs site.
 * Run: npx @11ty/eleventy --serve  (from project root)
 */
export default function (eleventyConfig) {
  // Static assets passthrough
  eleventyConfig.addPassthroughCopy("docs/src/public");

  // Shortcodes
  eleventyConfig.addShortcode("currentYear", () => String(new Date().getFullYear()));

  return {
    dir: {
      input: "docs/src",
      output: "docs/_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
