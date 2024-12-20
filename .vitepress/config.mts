import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "learn-network",
  description:
    "A comprehensive guide to understanding network concepts for web development",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/README" },
      // { text: 'Examples', link: '/examples' }
    ],
    outline: {
      level: [2, 3],
      label: "目录",
    },

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "introduction", link: "/README" },

          { text: "01.fundamentals", link: "/01.fundamentals/iso" },
          {
            text: "02.infrastructure",
            items: [
              { text: "summary", link: "/02.infrastructure/" },
              { text: "IP", link: "/02.infrastructure/ip" },
              { text: "ICMP", link: "/02.infrastructure/icmp" },
              { text: "UDP", link: "/02.infrastructure/udp" },
              { text: "TCP", link: "/02.infrastructure/tcp" },
              { text: "SOCKET", link: "/02.infrastructure/socket" },
              { text: "DNS", link: "/02.infrastructure/dns" },
              { text: "cdn", link: "/02.infrastructure/cdn" },
              { text: "HTTP", link: "/02.infrastructure/http" },
              { text: "WebSocket", link: "/02.infrastructure/websocket" },
              { text: "MQTT", link: "/02.infrastructure/mqtt" },
              { text: "OAuth", link: "/02.infrastructure/OAuth" },
            ],
          },
          { text: "03.browser", link: "/03.browser/fetch" },
          {
            text: "04.security",
            items: [
              { text: "summary", link: "/04.security/index" },
              { text: "Same Origin", link: "/04.security/sam-origin" },
              { text: "CORS", link: "/04.security/cros" },
              { text: "JS Attack", link: "/04.security/js-attack" },
              { text: "XSRF", link: "/04.security/xsrf" },
              { text: "XSS", link: "/04.security/xss" },
            ],
          },
          {
            text: "05.tools",
            items: [
              { text: "BPF", link: "/05.tools/BPF" },
              { text: "PING", link: "/05.tools/ping" },
              { text: "NAT Tap", link: "/05.tools/nattap" },
              { text: "Wireshark", link: "/05.tools/wireshark" },
            ],
          },
          { text: "06.other", link: "/06.other/" },
        ],
      },
      // {
      //   text: 'Examples',
      //   items: [
      //   ]
      // }
    ],
  },
});
