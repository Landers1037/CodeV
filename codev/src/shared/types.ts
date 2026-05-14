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

/** 终端配置。 */
export interface TerminalConfig {
  /** 渲染器类型。 */
  renderer: 'canvas' | 'html';
  /** 是否启用 GPU。 */
  gpu: boolean;
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
  /** 工具来源。 */
  source: ToolSource;
  /** 下载地址。 */
  downloadUrl: string;
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

/** 应用配置。 */
export interface AppConfig {
  /** 配置版本。 */
  configVersion: number;
  /** 工具分类列表。 */
  categories: string[];
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
