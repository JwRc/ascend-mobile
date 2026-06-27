import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type { ThemeColors } from '@/theme/colors';

export interface StripeCardWebViewRef {
  createPaymentMethod(billingDetails: { name?: string }): Promise<string>;
}

interface Props {
  publishableKey: string;
  colors: ThemeColors;
  radiusSm: number;
  onComplete(complete: boolean): void;
}

function buildHtml(key: string, c: ThemeColors, radius: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: transparent; overflow: hidden; }
    .label {
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: ${c.ink3};
      margin-bottom: 8px;
    }
    .el {
      background: ${c.surface2};
      border: 1.5px solid ${c.line};
      border-radius: ${radius}px;
      padding: 0 16px;
      height: 50px;
      display: flex;
      align-items: center;
      transition: border-color 0.15s;
    }
    .el.focused { border-color: ${c.ink}; }
    .row { display: flex; gap: 10px; }
    .half { flex: 1; }
    .field { margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .__PrivateStripeElement { width: 100% !important; }
  </style>
</head>
<body>
  <div class="field">
    <div class="label">Número do cartão</div>
    <div id="cn" class="el"></div>
  </div>
  <div class="row">
    <div class="field half">
      <div class="label">Validade</div>
      <div id="ce" class="el"></div>
    </div>
    <div class="field half">
      <div class="label">CVV</div>
      <div id="cc" class="el"></div>
    </div>
  </div>
  <script>
    var post = function(d) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(d));
    };
    var stripe = Stripe('${key}');
    var elements = stripe.elements();
    var baseStyle = {
      base: {
        color: '${c.ink}',
        fontSize: '16px',
        fontFamily: '-apple-system, system-ui, sans-serif',
        '::placeholder': { color: '${c.ink3}' },
      },
      invalid: { color: '#e5484d' },
    };
    var cn = elements.create('cardNumber', { style: baseStyle, showIcon: true });
    var ce = elements.create('cardExpiry', { style: baseStyle });
    var cc = elements.create('cardCvc',    { style: baseStyle });
    cn.mount('#cn'); ce.mount('#ce'); cc.mount('#cc');
    [['#cn', cn], ['#ce', ce], ['#cc', cc]].forEach(function(p) {
      var el = document.querySelector(p[0]);
      p[1].on('focus', function() { el.classList.add('focused'); });
      p[1].on('blur',  function() { el.classList.remove('focused'); });
    });
    var done = { n: false, e: false, c: false };
    function check() { post({ type: 'COMPLETE', complete: done.n && done.e && done.c }); }
    cn.on('change', function(e) { done.n = e.complete; check(); });
    ce.on('change', function(e) { done.e = e.complete; check(); });
    cc.on('change', function(e) { done.c = e.complete; check(); });
    window.doCreatePM = function(billingDetails) {
      stripe.createPaymentMethod({ type: 'card', card: cn, billing_details: billingDetails || {} })
        .then(function(r) {
          if (r.error) post({ type: 'PM_ERROR', message: r.error.message });
          else post({ type: 'PM_RESULT', id: r.paymentMethod.id });
        })
        .catch(function(err) { post({ type: 'PM_ERROR', message: err.message || 'Erro no cartão' }); });
    };
  </script>
</body>
</html>`;
}

export const StripeCardWebView = forwardRef<StripeCardWebViewRef, Props>(
  ({ publishableKey, colors, radiusSm, onComplete }, ref) => {
    const webviewRef = useRef<WebView>(null);
    const resolveRef = useRef<((id: string) => void) | null>(null);
    const rejectRef  = useRef<((err: Error) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      createPaymentMethod(billingDetails) {
        return new Promise<string>((resolve, reject) => {
          resolveRef.current = resolve;
          rejectRef.current  = reject;
          webviewRef.current?.injectJavaScript(
            `window.doCreatePM(${JSON.stringify(billingDetails)}); true;`
          );
        });
      },
    }));

    function onMessage(event: WebViewMessageEvent) {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'COMPLETE') {
          onComplete(msg.complete);
        } else if (msg.type === 'PM_RESULT') {
          resolveRef.current?.(msg.id);
          resolveRef.current = null;
          rejectRef.current  = null;
        } else if (msg.type === 'PM_ERROR') {
          rejectRef.current?.(new Error(msg.message));
          resolveRef.current = null;
          rejectRef.current  = null;
        }
      } catch { /* ignore */ }
    }

    return (
      <WebView
        ref={webviewRef}
        source={{ html: buildHtml(publishableKey, colors, radiusSm), baseUrl: 'https://stripe.com' }}
        onMessage={onMessage}
        scrollEnabled={false}
        style={{ height: Platform.OS === 'ios' ? 172 : 180, backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    );
  }
);
