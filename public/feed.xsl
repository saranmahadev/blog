<?xml version="1.0" encoding="UTF-8"?>
<!-- Shows RSS and Atom feeds as a readable page in a browser. Feed readers ignore it. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title><xsl:value-of select="/rss/channel/title | /atom:feed/atom:title"/> (feed)</title>
        <style>
          :root{color-scheme:light dark;--bg:#fff;--ink:#1c1c1c;--muted:#5b5b5b;--line:#1c1c1c;--accent:#0F7B4D;--tint:#e8f5ee}
          @media (prefers-color-scheme:dark){:root{--bg:#141414;--ink:#f2f2f2;--muted:#b4b4b4;--line:#f2f2f2;--accent:#5fd1a0;--tint:#1c2a23}}
          body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.6 Georgia,'Source Serif 4',serif}
          main{max-width:720px;margin:0 auto;padding:40px 20px 80px}
          .note{border:2px solid var(--line);box-shadow:4px 4px 0 var(--line);background:var(--tint);padding:16px 18px;margin-bottom:36px;font:16px/1.5 system-ui,sans-serif}
          .note a,.note code{font-weight:600}
          h1{font-size:40px;line-height:1.1;margin:0 0 8px}
          .desc{color:var(--muted);margin:0 0 32px}
          a{color:var(--accent)}
          article{border-top:2px solid var(--line);padding:22px 0}
          h2{font-size:26px;line-height:1.2;margin:0 0 6px}
          h2 a{color:inherit;text-decoration:none}
          h2 a:hover{text-decoration:underline}
          .meta{font:13px/1.4 ui-monospace,monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
          p{margin:8px 0 0}
        </style>
      </head>
      <body>
        <main>
          <div class="note">
            <strong>This is a feed.</strong> Copy this page's address into a feed reader (Feedly, NetNewsWire, Inoreader, Reeder) to get new posts as they are published.
            No account needed. Other formats: <a href="/atom.xml">Atom</a> and <a href="/feed.json">JSON Feed</a>.
          </div>
          <xsl:apply-templates select="/rss/channel | /atom:feed"/>
        </main>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="channel">
    <h1><xsl:value-of select="title"/></h1>
    <p class="desc"><xsl:value-of select="description"/> · <a href="{link}">Visit the site</a></p>
    <xsl:for-each select="item">
      <article>
        <div class="meta"><xsl:value-of select="substring(pubDate, 6, 11)"/> · <xsl:value-of select="dc:creator"/></div>
        <h2><a href="{link}"><xsl:value-of select="title"/></a></h2>
        <p><xsl:value-of select="description"/></p>
      </article>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="atom:feed">
    <h1><xsl:value-of select="atom:title"/></h1>
    <p class="desc"><xsl:value-of select="atom:subtitle"/> · <a href="{atom:link[@rel='alternate']/@href}">Visit the site</a></p>
    <xsl:for-each select="atom:entry">
      <article>
        <div class="meta"><xsl:value-of select="substring(atom:published, 1, 10)"/> · <xsl:value-of select="atom:author/atom:name"/></div>
        <h2><a href="{atom:link/@href}"><xsl:value-of select="atom:title"/></a></h2>
        <p><xsl:value-of select="atom:summary"/></p>
      </article>
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
