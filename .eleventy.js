/**
 * Eleventy config — better-pwa docs site.
 * Run: npx @11ty/eleventy --serve  (from project root)
 * Serves at: http://localhost:8080
 */
export default function (eleventyConfig) {
  // Static assets passthrough
  eleventyConfig.addPassthroughCopy("docs/src/public");

  // Layout aliases — map short names to nested dirs
  eleventyConfig.addLayoutAlias("base", "layouts/base.njk");
  eleventyConfig.addLayoutAlias("docs", "layouts/docs.njk");

  // Shortcodes
  eleventyConfig.addShortcode("currentYear", () => String(new Date().getFullYear()));

  return {
    dir: {
      input: "docs/src",
      output: "docs/_site",
      includes: "_includes",
      data: "../../docs/_data",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
