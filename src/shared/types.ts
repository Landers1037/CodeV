export type ProxyType = 'none' | 'http' | 'socks5';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** 代理配置。 */
export interface ProxyConfig {
  /** 代理类型。 */
  type: ProxyType;
  /** 代理地址。 */
  host: string;
  /** 代理端口。 */
  port: number;
  /** 代理用户名。 */
  username: string;
  /** 代理密码。 */
  password: string;
}

/** 下载配置。 */
export interface DownloadConfig {
  /** 临时目录。 */
  tempDir: string;
  /** 并发数。 */
  concurrency: number;
  /** 下载完成后是否通知。 */
  notifyOnComplete: boolean;
}

export type EnvMap = Record<string, string>;

export type TerminalColorScheme =
  | 'TokyoNight'
  | 'AtomOneDark'
  | 'AtomOneLight'
  | 'Dracula'
  | 'Github'
  | 'Night Owl'
  | 'Novel'
  | 'Ocean'
  | 'Solarized Dark'
  | 'Solarized Light';

/** 终端配置。 */
export interface TerminalConfig {
  /** 终端字体（主字体）。 */
  fontFamily: string;
  /** 终端字体大小。 */
  fontSize: number;
  /** 渲染器类型。 */
  renderer: 'canvas' | 'html';
  /** 是否启用 GPU。 */
  gpu: boolean;
  /** 终端配色方案。 */
  colorScheme: TerminalColorScheme;
  /** 终端主题。 */
  theme: 'light' | 'dark' | 'solarized-dark' | 'solarized-light';
}

/** 界面配置。 */
export interface UiConfig {
  /** 界面主题。 */
  theme: 'light' | 'dark';
  /** 关闭时是否最小化到托盘。 */
  closeToTray: boolean;
}

/** 高级配置。 */
export interface AdvancedConfig {
  /** 是否开机自启。 */
  autoStart: boolean;
  /** 日志等级。 */
  logLevel: LogLevel;
  /** 额外扫描目录。 */
  scanRoots: string[];
  /** 扫描层级。 */
  scanDepth: number;
}

export type ToolSource =
  | { kind: 'scan'; scanOnly: true }
  | {
      kind: 'githubRelease';
      scanOnly: false;
      repo: string;
    };

/** 工具元数据。 */
export interface ToolMeta {
  /** 工具唯一标识。 */
  id: string;
  /** 工具名称。 */
  name: string;
  /** 工具说明。 */
  description: string;
  /** 图标路径。 */
  logoPath: string;
  /** 工具分类。 */
  category: string;
  /** 是否需要（支持）下载。为 false 时不支持下载能力。 */
  needDownload: boolean;
  /** 工具来源。 */
  source?: ToolSource | null;
  /** 下载地址。 */
  downloadUrl?: string;
  /** 手动配置的安装路径。 */
  installPath: string;
  /** 自动检测到的安装路径。 */
  detectedInstallPath: string;
  /** 是否为图形界面程序。 */
  isGui: boolean;
  /** 程序名称。 */
  programName: string;
  /** 可执行文件名。 */
  binaryName: string;
  /** 默认启动参数。 */
  args: string[];
  /** 工具环境变量。 */
  env: EnvMap;
  /** 工具代理配置。 */
  proxy: ProxyConfig;
}

export interface RepoConfig {
  id: string;
  path: string;
}

export interface BookmarkConfig {
  id: string;
  url: string;
  title: string;
  iconPath: string;
}

export interface RepoSummary {
  id: string;
  path: string;
  name: string;
  branch: string;
  latestCommitOid: string;
  latestCommitDate: string;
}

export interface RepoCommit {
  oid: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

export interface RepoFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  isBinary: boolean;
  patch: string;
}

export interface RepoCommitDiff {
  oid: string;
  parentOid: string;
  files: RepoFileDiff[];
}

/** 应用配置。 */
export interface AppConfig {
  /** 配置版本。 */
  configVersion: number;
  /** 工具分类列表。 */
  categories: string[];
  /** Git 仓库列表。 */
  repos: RepoConfig[];
  /** 网页书签列表。 */
  bookmarks: BookmarkConfig[];
  /** 界面设置。 */
  ui: UiConfig;
  /** 下载设置。 */
  download: DownloadConfig;
  /** 全局代理设置。 */
  proxy: ProxyConfig;
  /** 环境变量设置。 */
  env: {
    /** 全局环境变量。 */
    global: EnvMap;
    /** 按工具区分的环境变量。 */
    perTool: Record<string, EnvMap>;
  };
  /** 终端设置。 */
  terminal: TerminalConfig;
  /** 高级设置。 */
  advanced: AdvancedConfig;
  /** 工具列表。 */
  tools: ToolMeta[];
}
