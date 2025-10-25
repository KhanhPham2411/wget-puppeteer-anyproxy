import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Remove CSS and JavaScript from HTML content
 * @param {string} htmlContent - The HTML content to clean
 * @returns {string} - The cleaned HTML content
 */
function cleanCssAndJs(htmlContent) {
  // Remove <style> blocks
  let cleaned = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove <script> blocks
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove style attributes
  cleaned = cleaned.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');
  // Remove onclick and other event attributes
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  return cleaned;
}

/**
 * Rewrite HTML hrefs from .html to .md for relative links (no scheme, //, mailto, tel, javascript, or fragment-only)
 */
function rewriteHtmlHrefs(htmlContent) {
  return htmlContent.replace(/(href\s*=\s*["'])([^"']+)(["'])/gi, (match, prefix, url, suffix) => {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) return match;
    const rewritten = url.replace(/\.html(\b|(?=[?#]))/i, '.md$1');
    return prefix + rewritten + suffix;
  });
}

/**
 * Post-process Markdown to rewrite .html links to .md for relative links
 */
function rewriteMarkdownLinks(markdown) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    if (/^(?:[a-z]+:\/\/|mailto:|tel:|javascript:|#)/i.test(url)) return match;
    const rewritten = url.replace(/\.html(\b|(?=[?#]))/i, '.md$1');
    return `[${text}](${rewritten})`;
  });
}

// Configure turndown service with options
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full'
});

/**
 * Convert HTML content to Markdown
 * @param {string} htmlContent - The HTML content to convert
 * @returns {string} - The converted Markdown content
 */
function convertHtmlToMarkdown(htmlContent) {
  try {
    const cleaned = cleanCssAndJs(htmlContent);
    const htmlWithMdHrefs = rewriteHtmlHrefs(cleaned);
    const markdown = turndownService.turndown(htmlWithMdHrefs);
    const finalMarkdown = rewriteMarkdownLinks(markdown);
    return finalMarkdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    return '';
  }
}

/**
 * Process a single HTML file and convert it to Markdown
 * @param {string} inputPath - Path to the input HTML file
 * @param {string} outputPath - Path for the output Markdown file
 */
function processHtmlFile(inputPath, outputPath) {
  try {
    console.log(`Processing: ${inputPath}`);
    
    // Read HTML file
    const htmlContent = fs.readFileSync(inputPath, 'utf8');
    
    // Convert to Markdown
    const markdownContent = convertHtmlToMarkdown(htmlContent);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write Markdown file
    fs.writeFileSync(outputPath, markdownContent, 'utf8');
    console.log(`Converted: ${outputPath}`);
    
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
  }
}

/**
 * Recursively find all HTML files in a directory
 * @param {string} dir - Directory to search
 * @returns {string[]} - Array of HTML file paths
 */
function findHtmlFiles(dir) {
  const htmlFiles = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (path.extname(item).toLowerCase() === '.html') {
        htmlFiles.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return htmlFiles;
}

/**
 * Convert all HTML files in a directory to Markdown
 * @param {string} inputDir - Input directory containing HTML files
 * @param {string} outputDir - Output directory for Markdown files
 */
function convertDirectory(inputDir, outputDir) {
  console.log(`Converting HTML files from ${inputDir} to ${outputDir}`);
  
  const htmlFiles = findHtmlFiles(inputDir);
  
  if (htmlFiles.length === 0) {
    console.log('No HTML files found in the input directory.');
    return;
  }
  
  console.log(`Found ${htmlFiles.length} HTML files to convert.`);
  
  for (const htmlFile of htmlFiles) {
    // Calculate relative path from input directory
    const relativePath = path.relative(inputDir, htmlFile);
    const outputPath = path.join(outputDir, relativePath.replace(/\.html$/i, '.md'));
    
    processHtmlFile(htmlFile, outputPath);
  }
  
  console.log('Conversion completed!');
}

/**
 * Main function to handle command line arguments
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node html-to-markdown.mjs <input-file> [output-file]');
    console.log('  node html-to-markdown.mjs <input-directory> [output-directory]');
    console.log('');
    console.log('Examples:');
    console.log('  node html-to-markdown.mjs input.html output.md');
    console.log('  node html-to-markdown.mjs ./output ./markdown-output');
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1];
  
  // Check if input exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Input path does not exist: ${inputPath}`);
    process.exit(1);
  }
  
  const stat = fs.statSync(inputPath);
  
  if (stat.isFile()) {
    // Single file conversion
    const outputFile = outputPath || inputPath.replace(/\.html$/i, '.md');
    processHtmlFile(inputPath, outputFile);
  } else if (stat.isDirectory()) {
    // Directory conversion
    const outputDir = outputPath || path.join(inputPath, '..', 'markdown-output');
    convertDirectory(inputPath, outputDir);
  } else {
    console.error('Input path is neither a file nor a directory.');
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
const isDirectRun = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  main();
}

export { convertHtmlToMarkdown, processHtmlFile, convertDirectory, findHtmlFiles };
