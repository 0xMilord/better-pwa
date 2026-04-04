/**
 * Eleventy config for better-pwa docs site.
 * Per DOCS.md spec: Eleventy + Nunjucks + plain CSS
 */
export default function (eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("docs/src/public");

  // Layout aliases
  eleventyConfig.addLayoutAlias("base", "layouts/base.njk");
  eleventyConfig.addLayoutAlias("docs", "layouts/docs.njk");

  // Shortcodes
  eleventyConfig.addShortcode("currentYear", () => new Date().getFullYear().toString());

  // Filter: format date
  eleventyConfig.addFilter("date", (dateObj) => {
    return new Date(dateObj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Filter: markdown in Nunjucks
  eleventyConfig.addFilter("markdown", (str) => {
    return str; // Content is already markdown, processed by eleventy
  });

  return {
    dir: {
      input: "docs/src",
      output: "docs/_site",
      includes: "_includes",
      data: "../_data",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
