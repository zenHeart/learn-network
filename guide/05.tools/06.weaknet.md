# 弱网优化

1. 弱网测试内容
   1. 弱网场景
      1. 网络制式测试
      2. WIFI/4g/3g/2g
      3. 高延时
      4. 高丢包
      5. 假热点
      6. 无网
         1. 功能是否受影响
         2. 不能闪退
   2. 网路环境切换测试
      1. WIFI <-> 4g,3g,2g
      2. WiFi <--> 无网
      3. 2g <-> 3g <-> 4g
      4. 2g,3g,4g <-> 无网
   3. 体验测试
      1. 响应时间
2. 弱网模拟
   1. charles 模拟弱网
   2. ios 搜索 developer, 搜索 Developer ->Network Link Conditioner 选择对应网络环境
   3. mac 进入 [xcode tools](https://developer.apple.com/download/all/?q=Network%20Link%20Conditioner) 搜索 Network Link Conditioner ,下载第一个工具,详见 [network condition link](https://nshipster.com/network-link-conditioner/)
      1. 进入 Hardware 目录，选择 Network Link Conditioner 即可
## 参考资料
* [弱网测试](https://cloud.tencent.com/developer/article/1973151)