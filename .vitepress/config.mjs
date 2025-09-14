import { withMermaid } from "vitepress-plugin-mermaid";
import checkbox from "markdown-it-checkbox";
const isDev = process.env.npm_lifecycle_script.includes("dev");

// https://vitepress.dev/reference/site-config
export default withMermaid({
  mermaidPlugin: {
    class: "mermaid ln-mermaid", // set additional css classes for parent container 
  },
  title: "learn-network",
  description: "前端网络手册",
  base: isDev ? "/" : "/learn-network/",
  themeConfig: {
    outline: [2, 3],
    lastUpdated: "Last Updated",
    docsRepo: "https://github.com/zenHeart/learn-network",
    docsBranch: "master",
    editLink: {
      pattern: "https://github.com/zenHeart/learn-network/edit/master/:path",
      text: "Edit this page on GitHub",
    },
    nav: [
      { text: "指南", link: "/README", activeMatch: "/README|guide/" },
      { text: "示例", link: "/examples/" },
      { text: "代办事项", link: "/todo/" },
    ],
    sidebar: {
      "/guide/": createGuide(),
      "/README": createGuide(),
      "/examples/": createExamples(),
    },
  },
  markdown: {
    config: (md) => {
      md.use(checkbox);
    },
  },
});

function createGuide() {
  return [
    { text: "绪论", link: "/README" },
    {
      text: "基础",
      link: "/guide/01.fundamentals/index",
      items: [{ text: "概念", link: "/guide/01.fundamentals/01.basic" }],
    },
    {
      text: "协议",
      link: "/guide/02.protocols/index",
      items: [
        {
          text: "网络层",
          items: [{ text: "IP", link: "/guide/02.protocols/02.ip" }],
        },
        {
          text: "传输层",
          items: [
            { text: "ICMP", link: "/guide/02.protocols/03.00.icmp" },
            { text: "UDP", link: "/guide/02.protocols/03.01.udp" },
            { text: "TCP", link: "/guide/02.protocols/03.02.tcp" },
            { text: "SSL TLS", link: "/guide/02.protocols/03.03.ssl-tls" },
            { text: "Socket", link: "/guide/02.protocols/03.04.socket" },
          ],
        },
        {
          text: "应用层",
          items: [
            { text: "DNS", link: "/guide/02.protocols/04.01.dns" },
            {
              text: "HTTP",
              items: [
                {
                  text: "URI",
                  link: "/guide/02.protocols/04.02.http/00.url-urn-uri",
                },
                {
                  text: "HTTP",
                  link: "/guide/02.protocols/04.02.http/01.http",
                },
                {
                  text: 'cache',
                  link: "/guide/02.protocols/04.02.http/02.cache",
                },
                {
                  text: 'cors',
                  link: "/guide/02.protocols/04.02.http/03.cors",
                },
                {
                  text: 'proxy',
                  items: [
                    {
                      text: 'pac',
                      link: "/guide/02.protocols/04.02.http/05.proxy/02.pac.md",
                    },
                  ],
                }
              ],
            },
            { text: "WebSocket", link: "/guide/02.protocols/04.03.websocket" },
            { text: "MQTT", link: "/guide/02.protocols/04.04.mqtt" },
            { text: "CDN", link: "/guide/02.protocols/04.05.CDN" },
            { text: "OAuth", link: "/guide/02.protocols/04.06.OAuth" },
          ],
        },
      ],
    },
    {
      text: "宿主环境",
      items: [{
        text: "浏览器",
        items: [
          { text: "XMLHttpRequest", link: "/guide/03.agent/01.browser/01.XMLHttpRequest" },
          { text: "Fetch", link: "/guide/03.agent/01.browser/02.fetch" },
        ]
      }]
    },
    {
      text: "安全",
      items: [
        { text: "Overview", link: "/guide/04.security/index" },
        { text: "Same Origin", link: "/guide/04.security/00.sam-origin" },
        { text: "JSONP", link: "/guide/04.security/01.JSONP.md" },
        { text: "XSRF", link: "/guide/04.security/01.xsrf" },
        { text: "XSS", link: "/guide/04.security/02.xss" },
        { text: "CORS", link: "/guide/04.security/03.cros" },
        { text: "JS Attack", link: "/guide/04.security/04.js-attack" },
      ],
    },
    {
      text: "工具",
      items: [
        { text: "BPF", link: "/guide/05.tools/00.BPF" },
        { text: "PING", link: "/guide/05.tools/01.ping" },
        { text: "NAT Tap", link: "/guide/05.tools/02.nattap" },
        { text: "Wireshark", link: "/guide/05.tools/03.wireshark" },
        { text: "OpenSSL", link: "/guide/05.tools/04.OpenSSL" },
      ],
    },
    { text: "其他", link: "/guide/06.other/" },
  ];
}

function createExamples() {
  return [
    {
      text: "示例",
      items: [
        {
          text: "概述",
          link: "/examples/",
        },
      ],
    },
  ];
}
