import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import hljs from 'highlight.js';
import prisma from '@/lib/prisma'; // ✅ Add your DB import

// ✅ Replace mock with real DB query
async function getNoteById(id: string) {
  try {
    const note = await prisma.note.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
      },
    });
    return note;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('📄 Starting PDF export for note:', id);

    const note = await getNoteById(id);
    if (!note) {
      console.error('❌ Note not found:', id);
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // 🧠 Configure marked with syntax highlighting
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              return code;
            }
          }
          try {
            return hljs.highlightAuto(code).value;
          } catch (err) {
            return code;
          }
        }
      })
    );

    marked.use({
      gfm: true,
      breaks: true,
    });

    // 🧼 Sanitize HTML
    const { window } = new JSDOM('');
    const DOMPurifyInstance = createDOMPurify(
      window as unknown as Window & typeof globalThis
    );
    const safeHTML = DOMPurifyInstance.sanitize(
      marked.parse(note.content || '') as string
    );

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // 🧾 Full HTML for PDF
    const fullHTML = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${note.title}</title>
          <style>
            @page { margin: 25mm; }
            body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
                   color:#1f2937; line-height:1.6; font-size:12pt; }
            h1,h2,h3,h4 { color:#111; margin-top:1.4em; }
            pre,code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; }
            pre { background:#f6f8fa; padding:12px; border-radius:6px; overflow-x:auto; }
            code { background:#f3f4f6; padding:2px 4px; border-radius:4px; }
            blockquote { border-left:4px solid #e5e7eb; padding-left:16px; color:#6b7280; margin:16px 0; font-style:italic; }
            table { border-collapse:collapse; width:100%; margin:16px 0; }
            th,td { border:1px solid #e5e7eb; padding:8px; text-align:left; font-size:10pt; }
            th { background:#f9fafb; }
            hr { border:none; border-top:1px solid #e5e7eb; margin:2em 0; }
            .hljs-comment,.hljs-quote{color:#6a737d;}
            .hljs-keyword,.hljs-selector-tag,.hljs-subst{color:#d73a49;}
            .hljs-literal,.hljs-number,.hljs-tag .hljs-attr,.hljs-template-variable,.hljs-variable{color:#005cc5;}
            .hljs-string,.hljs-doctag{color:#032f62;}
            .hljs-title,.hljs-section,.hljs-selector-id{color:#6f42c1;}
            .hljs-attr,.hljs-attribute,.hljs-name,.hljs-tag{color:#22863a;}
            .hljs-built_in,.hljs-class .hljs-title{color:#e36209;}
          </style>
        </head>
        <body>
          <h1>${note.title}</h1>
          <p style="color:#6b7280;font-size:10pt;">Created ${formattedDate}</p>
          ${safeHTML}
        </body>
      </html>
    `;

    // 🧠 Launch Puppeteer
    console.log('🚀 Launching Puppeteer...');
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
      });

      console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');

      await browser.close();

      return new Response(Uint8Array.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${note.title || 'note'}.pdf"`,
        },
      });
    } catch (err) {
      await browser.close();
      throw err;
    }

  } catch (error) {
    console.error('❌ PDF Export Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}