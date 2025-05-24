This document outlines the precedence of different methods of styling exports and outlines how to
customize the styling (such as margins and fonts) of an exported PDF file via `<style>` tags
embedded directly in the Markdown source.

# CSS Precedence
There are different ways to achieve styling of exported files with Markdown PDF Plus, and so in the
case that multiple ways are used simultaneously, it's important to know the order in which they are
applied during export in order to avoid unintended results. Below is the order of precedence for
styles (such that styles defined in methods higher on the list will override those defined in methods lower on the list):
1. In-line styles in raw HTML embedded in source Markdown.
2. Styles defined in the extension setting `markdown-pdf-plus.CSSRaw`.
3. Styles defined in a stylesheet located at the path provided by the extension setting `markdown-pdf-plus.CSSPath`.
4. Styles defined within `<style>` tags embedded the source Markdown, and styles defined in a stylesheet referenced by a `<link>` element in the source Markdown

# Defining Styles within Markdown-Embedded `<style>` Tags
 To help explain how this can be done with Markdown PDF Plus, let's reference [this project of mine](https://github.com/ThomasLatham/markdown-resume-template/tree/main/resume), a resume template that I wrote in Markdown, styled with CSS and exported to PDF:

1. Click on the link above to navigate to the `resume` directory in the `markdown-resume-template` repo.

2. Click  on `resume.md`, and then on that page click on "Code".

3. Notice the [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) HTML tag at the top of the Markdown document.
Markdown allows developers to embed raw HTML directly into documents (as seen here), and this HTML element is what enables us to add styling via linking to a [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) styles sheet. How are those styles defined precisely, we'll see in the next step, but for now do note the following:
  - The [`rel`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#rel) attribute has a value of `"stylesheet"`. This tells the underlying HTML of the Markdown file that the current `<link>` element is importing styles to the document.
  - The [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#type) attribute has a value of `"text/css"`. This value is the mime type of a CSS style sheet, but CSS is the only style sheet used on the web, so the omission of this attribute (`type`) is actually recommended nowadays.
  - The [`href`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#href) attribute has a value of `"resume.css"`. This attribute tells the HTML where to find the style sheet via a URL. The URL in this example is relative to the Markdown file (the CSS file is in the same directory as the Markdown file, as we'll see), but the value of `href` can also be a URL to a CSS file file stored somewhere on the Web.

1. Navigate back to the location in step (1.), and click on `resume.css`. Notice that this is the file to which we pointed using the `href` attribute in the step (3.). Now let's analyze some details of this style sheet:
  - The [`@page`](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) at-rule allows us to define particulars of exported PDF pages, such as the margin widths and the page size. Note that the extension setting `markdown-pdf-plus.usePageStyleFromCSS` *should* be set to `true` in order for this to work (although I think there may be a bug causing the `@page` rules to override default styles regardless of that setting).
  - The `body` CSS rules (applying to everything in the file `resume.md`, unless a rule with stronger specificity is applied somewhere) define a `font-size` of `12px` and a `font-family` (the font itself) of `Roboto`.

2. Now, when Markdown PDF Plus is used to export `resume.md` as a PDF, the result will be equivalent to the file `resume.pdf`, available in the location specified in step (1.).

Following these same steps for a different file, or even cloning `markdown-resume-template` and
adjusting any of the templates to your own tastes, should produce PDFs from Markdown with the styles
you're after, like fine-tuned margins and explicit fonts.
