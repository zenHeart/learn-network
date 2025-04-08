import { withMermaid } from "vitepress-plugin-mermaid"
const isDev = process.env.npm_lifecycle_script.includes('dev')

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: "learn-network",
  description: "前端网络手册",
  base: isDev ? "/" : "/learn-network/",
  themeConfig: {
    lastUpdated: 'Last Updated',
    docsRepo: 'https://github.com/zenHeart/learn-network',
    docsBranch: 'master',
    editLink: {
      pattern: 'https://github.com/zenHeart/learn-network/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    nav: [
      { text: "指南", link: "/README" },
      { text: "示例", link: "/examples/" },
    ],
    sidebar: {
      '/': createGuide(),
      '/examples/': createExamples(),
    }
  },
});


function createGuide() {
  return [{
    text: "Guide",
    items: [
      // { text: "introduction", link: "/README" },
      {
        text: "01.fundamentals",
        items: [
          { text: "Overview", link: "/01.fundamentals/index" },
          { text: "Basic", link: "/01.fundamentals/01.basic" },
        ],
      },
      {
        text: "02.protocols",
        items: [
          { text: "Overview", link: "/02.protocols/index" },
          { text: "IP", link: "/02.protocols/02.ip" },
          { text: "ICMP", link: "/02.protocols/03.00.icmp" },
          { text: "UDP", link: "/02.protocols/03.01.udp" },
          { text: "TCP", link: "/02.protocols/03.02.tcp" },
          { text: "Socket", link: "/02.protocols/03.03.socket" },
          { text: "DNS", link: "/02.protocols/04.01.dns" },
          { text: "HTTP", link: "/02.protocols/04.02.http" },
          { text: "WebSocket", link: "/02.protocols/04.03.websocket" },
          { text: "MQTT", link: "/02.protocols/04.04.mqtt" },
          { text: "CDN", link: "/02.protocols/04.05.CDN" },
          { text: "OAuth", link: "/02.protocols/04.06.OAuth" },
        ],
      },
      { text: "03.browser", link: "/03.browser/fetch" },
      {
        text: "04.security",
        items: [
          { text: "Overview", link: "/04.security/index" },
          { text: "Same Origin", link: "/04.security/00.sam-origin" },
          { text: "XSRF", link: "/04.security/01.xsrf" },
          { text: "XSS", link: "/04.security/02.xss" },
          { text: "CORS", link: "/04.security/03.cros" },
          { text: "JS Attack", link: "/04.security/04.js-attack" },
        ],
      },
      {
        text: "05.tools",
        items: [
          { text: "BPF", link: "/05.tools/00.BPF" },
          { text: "PING", link: "/05.tools/01.ping" },
          { text: "NAT Tap", link: "/05.tools/02.nattap" },
          { text: "Wireshark", link: "/05.tools/03.wireshark" },
        ],
      },
      { text: "06.other", link: "/06.other/" },
    ],
  }]
}



function createExamples() {
  return [{
    text: "示例",
    items: [
      {
        text: "概述",
        link: "/examples/"
      },
      {
        text: "http",
        items: [
          { text: "cros", link: "/examples/http/cros/README.md" },
          { text: "cache", link: "/examples/http/cache/README.md" },
        ],
      },
      {
        text: "JSONP",
        items: [
          { text: "JSONP", link: "/examples/JSONP/README.md" },
        ],
      }
    ],
  }]
}