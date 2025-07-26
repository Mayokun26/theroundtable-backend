import Document, { DocumentContext, Html, Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
          <meta name="theme-color" content="#1976d2" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
            rel="stylesheet"
          />
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Mobile optimizations */
              * {
                box-sizing: border-box;
              }
              
              html {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
              }
              
              body {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                touch-action: manipulation;
              }
              
              /* Improve tap targets */
              button, [role="button"], input[type="submit"], input[type="button"] {
                min-height: 44px;
                min-width: 44px;
              }
              
              @media (max-width: 600px) {
                button, [role="button"], input[type="submit"], input[type="button"] {
                  min-height: 48px;
                  min-width: 48px;
                }
              }
              
              /* Prevent zoom on input focus on iOS */
              @media screen and (max-width: 767px) {
                input[type="text"], input[type="email"], input[type="password"], textarea, select {
                  font-size: 16px !important;
                }
              }
              
              /* Improve scrollbar on mobile */
              ::-webkit-scrollbar {
                width: 4px;
                height: 4px;
              }
              
              ::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
              }
              
              ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
              }
              
              ::-webkit-scrollbar-thumb:hover {
                background: #a1a1a1;
              }
            `
          }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
} 