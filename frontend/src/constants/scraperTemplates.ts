// src/constants/scraperTemplates.ts
// 预设爬虫模板 - 常见网站的开箱即用配置

export interface ScraperTemplate {
  id: string;
  name: string;
  description: string;
  category: 'news' | 'social' | 'ecommerce' | 'tech' | 'entertainment' | 'other';
  icon: string;
  url: string;
  selectors: {
    container?: string;
    title: string;
    link?: string;
    description?: string;
    image?: string;
    author?: string;
    date?: string;
    tags?: string;
    custom?: Record<string, string>;
  };
  example: {
    title: string;
    description?: string;
  };
  tips?: string[];
}

export const scraperTemplates: ScraperTemplate[] = [
  // ==================== 新闻/热搜类 ====================
  {
    id: 'baidu-hotlist',
    name: '百度热搜榜',
    description: '抓取百度实时热搜榜单，包括标题、热度、排名',
    category: 'news',
    icon: '🔥',
    url: 'https://top.baidu.com/board?tab=realtime',
    selectors: {
      container: '.category-wrap_iQLoo',
      title: '.c-single-text-ellipsis',
      custom: {
        hotIndex: '.hot-index_1Bl1a',
        rank: '.index_1Ew5p',
      },
    },
    example: {
      title: '一起为梦想奋斗、为幸福打拼',
      description: '热度: 7904251',
    },
    tips: [
      '使用"循环元素"节点遍历所有热搜项',
      '热度值在 .hot-index_1Bl1a 元素中',
      '排名在 .index_1Ew5p 元素中',
    ],
  },
  {
    id: 'weibo-hotlist',
    name: '微博热搜',
    description: '抓取微博实时热搜榜单',
    category: 'social',
    icon: '🔥',
    url: 'https://s.weibo.com/top/summary',
    selectors: {
      container: '#pl_top_realtimehot table tbody tr',
      title: 'td:nth-child(2) a',
      custom: {
        hotValue: 'td:nth-child(2) span',
        rank: 'td:nth-child(1)',
      },
    },
    example: {
      title: '热搜话题',
      description: '热度值显示在标题旁边',
    },
    tips: [
      '需要处理广告行（跳过第一行）',
      '热度值可能包含"万"等单位',
    ],
  },
  {
    id: 'zhihu-hotlist',
    name: '知乎热榜',
    description: '抓取知乎热榜问题和热度',
    category: 'social',
    icon: '💡',
    url: 'https://www.zhihu.com/hot',
    selectors: {
      container: '.HotList-list section',
      title: '.HotItem-title',
      description: '.HotItem-excerpt',
      link: 'a',
      custom: {
        hotValue: '.HotItem-metrics',
      },
    },
    example: {
      title: '如何看待...',
      description: '问题描述摘要',
    },
    tips: [
      '知乎可能需要登录才能访问完整内容',
      '热度值格式: "XXX 万热度"',
    ],
  },
  {
    id: 'toutiao-news',
    name: '今日头条',
    description: '抓取今日头条新闻列表',
    category: 'news',
    icon: '📰',
    url: 'https://www.toutiao.com/',
    selectors: {
      container: '.article-item',
      title: '.title',
      link: 'a',
      image: 'img',
      author: '.source',
      custom: {
        commentCount: '.comment-count',
      },
    },
    example: {
      title: '新闻标题',
      description: '包含作者、评论数等信息',
    },
  },

  // ==================== 科技类 ====================
  {
    id: 'github-trending',
    name: 'GitHub Trending',
    description: '抓取 GitHub 趋势项目',
    category: 'tech',
    icon: '⭐',
    url: 'https://github.com/trending',
    selectors: {
      container: 'article.Box-row',
      title: 'h2 a',
      description: 'p.col-9',
      link: 'h2 a',
      custom: {
        language: '[itemprop="programmingLanguage"]',
        stars: '.float-sm-right',
        todayStars: '.float-sm-right:last-child',
      },
    },
    example: {
      title: 'owner/repo-name',
      description: '项目描述',
    },
    tips: [
      '可以通过 URL 参数筛选语言: ?language=javascript',
      '可以筛选时间范围: ?since=daily',
    ],
  },
  {
    id: 'v2ex-hot',
    name: 'V2EX 热门',
    description: '抓取 V2EX 热门话题',
    category: 'tech',
    icon: '🔥',
    url: 'https://www.v2ex.com/?tab=hot',
    selectors: {
      container: '.cell.item',
      title: '.item_title a',
      link: '.item_title a',
      author: '.small.fade strong a',
      custom: {
        node: '.node',
        replies: '.count_livid',
      },
    },
    example: {
      title: '话题标题',
      description: '包含节点、作者、回复数',
    },
  },
  {
    id: 'juejin-hot',
    name: '掘金热榜',
    description: '抓取掘金技术文章热榜',
    category: 'tech',
    icon: '📝',
    url: 'https://juejin.cn/hot/articles',
    selectors: {
      container: '.entry-list .entry',
      title: '.title',
      link: 'a.title',
      author: '.username',
      custom: {
        likes: '.like-count',
        comments: '.comment-count',
      },
    },
    example: {
      title: '技术文章标题',
      description: '包含作者、点赞数、评论数',
    },
  },

  // ==================== 电商类 ====================
  {
    id: 'taobao-search',
    name: '淘宝商品搜索',
    description: '抓取淘宝搜索结果',
    category: 'ecommerce',
    icon: '🛒',
    url: 'https://s.taobao.com/search?q=关键词',
    selectors: {
      container: '.item',
      title: '.title',
      link: '.pic a',
      image: '.pic img',
      custom: {
        price: '.price',
        sales: '.deal-cnt',
        shop: '.shop',
      },
    },
    example: {
      title: '商品标题',
      description: '包含价格、销量、店铺',
    },
    tips: [
      '需要替换 URL 中的"关键词"',
      '淘宝有反爬机制，建议降低请求频率',
      '可能需要设置 User-Agent',
    ],
  },
  {
    id: 'jd-search',
    name: '京东商品搜索',
    description: '抓取京东搜索结果',
    category: 'ecommerce',
    icon: '🛍️',
    url: 'https://search.jd.com/Search?keyword=关键词',
    selectors: {
      container: '.gl-item',
      title: '.p-name em',
      link: '.p-img a',
      image: '.p-img img',
      custom: {
        price: '.p-price i',
        comments: '.p-commit strong',
        shop: '.p-shop',
      },
    },
    example: {
      title: '商品标题',
      description: '包含价格、评论数、店铺',
    },
    tips: [
      '需要替换 URL 中的"关键词"',
      '价格可能需要额外请求获取',
    ],
  },

  // ==================== 娱乐类 ====================
  {
    id: 'douban-movie-top250',
    name: '豆瓣电影 Top250',
    description: '抓取豆瓣电影 Top250 榜单',
    category: 'entertainment',
    icon: '🎬',
    url: 'https://movie.douban.com/top250',
    selectors: {
      container: '.grid_view li',
      title: '.title',
      link: '.hd a',
      image: '.pic img',
      description: '.quote .inq',
      custom: {
        rating: '.rating_num',
        ratingPeople: '.star span:last-child',
        year: '.bd p:first-child',
      },
    },
    example: {
      title: '肖申克的救赎',
      description: '评分: 9.7',
    },
    tips: [
      '共10页，每页25部电影',
      '可以通过 ?start=25 参数翻页',
    ],
  },
  {
    id: 'bilibili-hot',
    name: 'B站热门视频',
    description: '抓取B站热门视频列表',
    category: 'entertainment',
    icon: '📺',
    url: 'https://www.bilibili.com/v/popular/all',
    selectors: {
      container: '.video-card',
      title: '.video-name',
      link: 'a',
      image: '.cover-picture img',
      author: '.up-name',
      custom: {
        views: '.play-text',
        danmaku: '.dm-text',
      },
    },
    example: {
      title: '视频标题',
      description: '包含UP主、播放量、弹幕数',
    },
  },
  {
    id: 'douyin-hot',
    name: '抖音热榜',
    description: '抓取抖音热搜榜单',
    category: 'entertainment',
    icon: '🎵',
    url: 'https://www.douyin.com/hot',
    selectors: {
      container: '.hot-list-item',
      title: '.title',
      custom: {
        hotValue: '.hot-value',
        rank: '.rank',
      },
    },
    example: {
      title: '热搜话题',
      description: '包含热度值和排名',
    },
    tips: [
      '抖音有较强的反爬机制',
      '建议使用无头浏览器模式',
    ],
  },

  // ==================== 其他类 ====================
  {
    id: 'weather',
    name: '天气预报',
    description: '抓取天气预报信息',
    category: 'other',
    icon: '🌤️',
    url: 'https://www.weather.com.cn/weather/101010100.shtml',
    selectors: {
      container: '#7d ul li',
      title: 'h1',
      custom: {
        date: 'h1',
        weather: 'p.wea',
        temperature: 'p.tem span',
        wind: 'p.win span',
      },
    },
    example: {
      title: '北京天气',
      description: '包含日期、天气、温度、风力',
    },
  },
  {
    id: 'job-51job',
    name: '前程无忧职位',
    description: '抓取前程无忧职位列表',
    category: 'other',
    icon: '💼',
    url: 'https://search.51job.com/list/000000,000000,0000,00,9,99,关键词,2,1.html',
    selectors: {
      container: '.el',
      title: '.t1 span a',
      link: '.t1 span a',
      custom: {
        company: '.t2 a',
        salary: '.t4',
        location: '.t3',
      },
    },
    example: {
      title: '职位名称',
      description: '包含公司、薪资、地点',
    },
    tips: [
      '需要替换 URL 中的"关键词"',
      '可以通过参数筛选城市、薪资等',
    ],
  },
  {
    id: 'zhipin-job',
    name: 'BOSS直聘职位',
    description: '抓取BOSS直聘职位列表',
    category: 'other',
    icon: '💼',
    url: 'https://www.zhipin.com/web/geek/job?query=关键词',
    selectors: {
      container: '.job-card-wrapper',
      title: '.job-name',
      link: 'a',
      custom: {
        salary: '.salary',
        company: '.company-name',
        tags: '.tag-list span',
      },
    },
    example: {
      title: '职位名称',
      description: '包含薪资、公司、标签',
    },
    tips: [
      '需要替换 URL 中的"关键词"',
      'BOSS直聘有反爬机制，建议设置合理的延迟',
    ],
  },
];

// 按分类分组
export const scraperTemplatesByCategory = {
  news: scraperTemplates.filter(t => t.category === 'news'),
  social: scraperTemplates.filter(t => t.category === 'social'),
  tech: scraperTemplates.filter(t => t.category === 'tech'),
  ecommerce: scraperTemplates.filter(t => t.category === 'ecommerce'),
  entertainment: scraperTemplates.filter(t => t.category === 'entertainment'),
  other: scraperTemplates.filter(t => t.category === 'other'),
};

// 分类名称映射
export const categoryNames = {
  news: '新闻热搜',
  social: '社交媒体',
  tech: '科技开发',
  ecommerce: '电商购物',
  entertainment: '娱乐影音',
  other: '其他',
};

// 根据 ID 获取模板
export function getTemplateById(id: string): ScraperTemplate | undefined {
  return scraperTemplates.find(t => t.id === id);
}

// 搜索模板
export function searchTemplates(keyword: string): ScraperTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return scraperTemplates.filter(
    t =>
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword)
  );
}

export default scraperTemplates;
